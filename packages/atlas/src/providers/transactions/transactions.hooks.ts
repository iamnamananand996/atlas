import { useApolloClient } from '@apollo/client'
import BN from 'bn.js'
import { useCallback } from 'react'

import { MetaprotocolTransactionSuccessFieldsFragment } from '@/api/queries/__generated__/fragments.generated'
import {
  GetMetaprotocolTransactionStatusEventsDocument,
  GetMetaprotocolTransactionStatusEventsQuery,
  GetMetaprotocolTransactionStatusEventsQueryVariables,
} from '@/api/queries/__generated__/transactionEvents.generated'
import { ErrorCode, JoystreamLibError, JoystreamLibErrorType } from '@/joystream-lib/errors'
import { ExtrinsicResult, ExtrinsicStatus, ExtrinsicStatusCallbackFn } from '@/joystream-lib/types'
import { useSubscribeAccountBalance } from '@/providers/joystream/joystream.hooks'
import { useUserStore } from '@/providers/user/user.store'
import { createId } from '@/utils/createId'
import { ConsoleLogger, SentryLogger } from '@/utils/logs'
import { wait } from '@/utils/misc'

import {
  METAPROTOCOL_TX_STATUS_RETRIES,
  METAPROTOCOL_TX_STATUS_RETRIES_TIMEOUT,
  MINIMIZED_SIGN_CANCELLED_SNACKBAR_TIMEOUT,
  TX_COMPLETED_SNACKBAR_TIMEOUT,
  TX_SIGN_CANCELLED_SNACKBAR_TIMEOUT,
} from './transactions.config'
import { useTransactionManagerStore } from './transactions.store'
import { Transaction } from './transactions.types'

import { useConfirmationModal } from '../confirmationModal'
import { useConnectionStatusStore } from '../connectionStatus'
import { DisplaySnackbarArgs, useSnackbar } from '../snackbars'

type HandleTransactionOpts<T extends ExtrinsicResult> = {
  txFactory: (updateStatus: ExtrinsicStatusCallbackFn) => Promise<T>
  preProcess?: () => void | Promise<void>
  onTxSign?: () => void
  onTxFinalize?: (data: T) => Promise<unknown>
  onTxSync?: (data: T, metaStatus?: MetaprotocolTransactionSuccessFieldsFragment) => Promise<unknown>
  onError?: () => void
  snackbarSuccessMessage?: DisplaySnackbarArgs
  minimized?: {
    errorMessage: string
  }
  allowMultiple?: boolean // whether to allow sending a transaction when one is still processing
  unsignedMessage?: string
  disableQNSync?: boolean
  fee?: BN
}
type HandleTransactionFn = <T extends ExtrinsicResult>(opts: HandleTransactionOpts<T>) => Promise<boolean>

export const useTransaction = (): HandleTransactionFn => {
  const { addBlockAction, addTransaction, updateTransaction, removeTransaction } = useTransactionManagerStore(
    (state) => state.actions
  )
  const userWalletName = useUserStore((state) => state.wallet?.title)

  const [openOngoingTransactionModal, closeOngoingTransactionModal] = useConfirmationModal()
  const nodeConnectionStatus = useConnectionStatusStore((state) => state.nodeConnectionStatus)
  const { displaySnackbar } = useSnackbar()
  const getMetaprotocolTxStatus = useMetaprotocolTransactionStatus()
  const { totalBalance } = useSubscribeAccountBalance()

  return useCallback(
    async ({
      preProcess,
      txFactory,
      onTxSign,
      onTxFinalize,
      onTxSync,
      snackbarSuccessMessage,
      onError,
      minimized = null,
      allowMultiple,
      unsignedMessage,
      disableQNSync,
      fee,
    }) => {
      /* === check whether new transaction can be started === */
      if (nodeConnectionStatus !== 'connected') {
        ConsoleLogger.error('Tried submitting transaction when not connected to Joystream node')
        return false
      }

      if (fee && totalBalance?.lt(fee)) {
        displaySnackbar({
          title: 'Not enough funds',
          description:
            "You don't have enough funds to cover blockchain transaction fee for this operation. Please, top up your account balance and try again.",
          iconType: 'error',
        })
        return false
      }

      // get transactions with getState() - this way the hook doesn't subscribe to state changes and can restrict re-renders of consumers
      const pendingTransactions = Object.values(useTransactionManagerStore.getState().transactions)
      const anyPendingTransactions = pendingTransactions.length > 0
      const anyUnsignedTransaction = pendingTransactions.some((tx) => tx.status === ExtrinsicStatus.Unsigned)

      // don't continue if:
      // 1. there is any transaction waiting for signature, OR
      // 2. there is any transaction in progress and `allowMultiple` is false
      if (anyUnsignedTransaction || (anyPendingTransactions && !allowMultiple)) {
        openOngoingTransactionModal({
          title: anyUnsignedTransaction ? 'Sign outstanding transactions' : 'Wait for other transactions',
          type: 'informative',
          description: anyUnsignedTransaction
            ? `You have outstanding blockchain transactions waiting for you to sign them in ${userWalletName}. Please, sign or cancel previous transactions in ${userWalletName} to continue.`
            : 'You have other blockchain transactions which are still being processed. Please, try again in about a minute.',
          primaryButton: {
            text: 'Got it',
            onClick: () => {
              closeOngoingTransactionModal()
            },
          },
        })
        return false
      }

      /* === prepare new transaction === */
      const transactionId = createId()
      const transaction: Transaction = {
        id: transactionId,
        isMinimized: !!minimized,
        status: ExtrinsicStatus.ProcessingAssets, // use that as base status, if not applicable it will be overwritten right away
        errorCode: null,
        unsignedMessage,
      }
      addTransaction(transaction)

      const updateStatus = (status: ExtrinsicStatus, errorCode?: ErrorCode) => {
        updateTransaction(transactionId, { ...transaction, status, errorCode: errorCode || null })
      }

      try {
        /* === if applicable, do any preprocessing === */
        if (preProcess) {
          try {
            await preProcess()
          } catch (e) {
            SentryLogger.error('Failed transaction preprocess', 'TransactionManager', e)
            return false
          }
        }

        /* === send the tx === */
        updateStatus(ExtrinsicStatus.Unsigned)
        const handleTxStatusChange = (status: ExtrinsicStatus) => {
          if (status === ExtrinsicStatus.Signed) {
            try {
              onTxSign?.()
            } catch (error) {
              SentryLogger.error('Failed transaction signed callback', 'TransactionManager', error)
            }
          }
          updateStatus(status)
        }
        const result = await txFactory(handleTxStatusChange) // txFactory will return only once the tx has been included in a block and that block has been finalized

        /* === if provided, run finalize callback === */
        updateStatus(ExtrinsicStatus.Syncing)
        if (onTxFinalize) {
          onTxFinalize(result).catch((error) =>
            SentryLogger.error('Failed transaction finalize callback', 'TransactionManager', error)
          )
        }

        /* === wait until QN reports the block in which the tx was included as processed === */
        // if this is a metaprotocol transaction, we will also wait until we successfully query the transaction result from QN
        const queryNodeSyncPromise = new Promise<void>((resolve, reject) => {
          const syncCallback = async () => {
            let status: MetaprotocolTransactionSuccessFieldsFragment | undefined = undefined
            try {
              if (result.metaprotocol && result.transactionHash) {
                status = await getMetaprotocolTxStatus(result.transactionHash)
              }
            } catch (e) {
              reject(e)
              return
            }

            if (onTxSync) {
              try {
                await onTxSync(result, status)
              } catch (error) {
                SentryLogger.error('Failed transaction sync callback', 'TransactionManager', error)
              }
            }
            resolve()
          }

          if (disableQNSync) {
            syncCallback()
          } else {
            addBlockAction({ callback: syncCallback, targetBlock: result.block })
          }
        })
        await queryNodeSyncPromise

        /* === transaction was successful, do necessary cleanup === */
        updateStatus(ExtrinsicStatus.Completed)
        if (snackbarSuccessMessage) {
          displaySnackbar({
            ...snackbarSuccessMessage,
            iconType: 'success',
            timeout: TX_COMPLETED_SNACKBAR_TIMEOUT,
          })
        }

        // if it's a minimized transaction, remove it from the list right away
        // if it's a regular one, it will get removed by TransactionsManager when the transaction modal is closed
        if (minimized) {
          removeTransaction(transactionId)
        }

        return true
      } catch (error) {
        onError?.()

        const errorName = error.name as JoystreamLibErrorType

        if (errorName === 'AccountBalanceTooLow') {
          if (minimized) {
            removeTransaction(transactionId)
            displaySnackbar({
              title: 'Insufficient balance to perform this action.',
              description: minimized.errorMessage,
              iconType: 'error',
              timeout: MINIMIZED_SIGN_CANCELLED_SNACKBAR_TIMEOUT,
            })
          } else {
            updateStatus(ExtrinsicStatus.Error, ErrorCode.InsufficientBalance)
          }
          return false
        }

        if (errorName === 'SignCancelledError') {
          ConsoleLogger.warn('Sign cancelled')
          removeTransaction(transactionId)
          displaySnackbar({
            title: 'Transaction signing cancelled',
            iconType: 'warning',
            timeout: TX_SIGN_CANCELLED_SNACKBAR_TIMEOUT,
          })
          return false
        }

        const handleError = () => {
          if (minimized) {
            displaySnackbar({
              title: 'Something went wrong',
              description: minimized.errorMessage,
              iconType: 'error',
              timeout: MINIMIZED_SIGN_CANCELLED_SNACKBAR_TIMEOUT,
            })
            removeTransaction(transactionId) // if it's a regular transaction, it will get removed by TransactionsManager when the transaction modal is closed
          } else {
            updateStatus(ExtrinsicStatus.Error)
          }
        }

        if (errorName === 'MetaprotocolTransactionError') {
          SentryLogger.error('Metaprotocol transaction error', 'TransactionManager', error)
          handleError()
          return false
        }

        const extrinsicFailed = errorName === 'FailedError'

        if (extrinsicFailed) {
          // extract error code from error message
          const errorCode = Object.keys(ErrorCode).find((key) =>
            error.message.split(' ').find((word: string) => word === key)
          ) as ErrorCode | undefined

          updateStatus(ExtrinsicStatus.Error, errorCode)
        }
        SentryLogger.error(
          extrinsicFailed ? 'Extrinsic failed' : 'Unknown sendExtrinsic error',
          'TransactionManager',
          error
        )
        handleError()
        return false
      }
    },
    [
      addBlockAction,
      addTransaction,
      closeOngoingTransactionModal,
      displaySnackbar,
      getMetaprotocolTxStatus,
      nodeConnectionStatus,
      openOngoingTransactionModal,
      removeTransaction,
      totalBalance,
      updateTransaction,
      userWalletName,
    ]
  )
}

const useMetaprotocolTransactionStatus = () => {
  const client = useApolloClient()

  const getTransactionStatus = useCallback(
    async (txHash: string) => {
      const { data } = await client.query<
        GetMetaprotocolTransactionStatusEventsQuery,
        GetMetaprotocolTransactionStatusEventsQueryVariables
      >({
        query: GetMetaprotocolTransactionStatusEventsDocument,
        variables: {
          transactionHash: txHash,
        },
      })
      return data?.metaprotocolTransactionStatusEvents[0]?.status || null
    },
    [client]
  )

  return useCallback(
    async (txHash: string): Promise<MetaprotocolTransactionSuccessFieldsFragment> => {
      let status = await getTransactionStatus(txHash)

      if (!status) {
        for (let i = 0; i <= METAPROTOCOL_TX_STATUS_RETRIES; i++) {
          ConsoleLogger.warn(`No transaction status event found - retries: ${i + 1}/${METAPROTOCOL_TX_STATUS_RETRIES}`)
          await wait(METAPROTOCOL_TX_STATUS_RETRIES_TIMEOUT)

          status = await getTransactionStatus(txHash)

          if (status?.__typename === 'MetaprotocolTransactionSuccessful') {
            break
          }
        }

        if (!status) {
          throw new JoystreamLibError({
            name: 'MetaprotocolTransactionError',
            message: 'No transaction status event found',
          })
        }
      }

      if (status.__typename !== 'MetaprotocolTransactionSuccessful') {
        throw new JoystreamLibError({
          name: 'MetaprotocolTransactionError',
          message:
            status.__typename === 'MetaprotocolTransactionErrored'
              ? status.message
              : 'Transaction still in pending state after retries',
        })
      }

      return status
    },
    [getTransactionStatus]
  )
}
