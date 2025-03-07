import styled from '@emotion/styled'
import { FC, MouseEvent, memo, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { CSSTransition } from 'react-transition-group'

import { getNftStatus } from '@/api/hooks/nfts'
import { useFullVideo } from '@/api/hooks/video'
import {
  SvgActionEdit,
  SvgActionHide,
  SvgActionReupload,
  SvgActionTrash,
  SvgActionWarning,
  SvgIllustrativePlay,
  SvgIllustrativeReupload,
} from '@/assets/icons'
import { OwnerPill } from '@/components/OwnerPill'
import { Pill } from '@/components/Pill'
import { UploadProgressBar } from '@/components/UploadProgressBar'
import { Button } from '@/components/_buttons/Button'
import { absoluteRoutes } from '@/config/routes'
import { useGetNftSlot } from '@/hooks/useGetNftSlot'
import { useNftState } from '@/hooks/useNftState'
import { useVideoContextMenu } from '@/hooks/useVideoContextMenu'
import { useVideoTileSharedLogic } from '@/hooks/useVideoTileSharedLogic'
import { useMemberAvatar } from '@/providers/assets/assets.hooks'
import { useNftActions } from '@/providers/nftActions/nftActions.hooks'
import { useUploadsStore } from '@/providers/uploads/uploads.store'
import { SentryLogger } from '@/utils/logs'
import { formatDurationShort } from '@/utils/time'

import { SlotsObject } from '../VideoThumbnail'
import { VideoTile } from '../VideoTile'

type VideoTilePublisherProps = {
  id?: string
  onEditClick?: (e?: MouseEvent<Element>) => void
  onMintNftClick?: (e?: MouseEvent<Element>) => void
  onDeleteVideoClick?: () => void
  onReuploadVideoClick?: () => void
}

export const DELAYED_FADE_CLASSNAME = 'delayed-fade'

export const VideoTilePublisher: FC<VideoTilePublisherProps> = memo(
  ({ id, onEditClick, onDeleteVideoClick, onReuploadVideoClick, onMintNftClick }) => {
    const { video, loading } = useFullVideo(id ?? '', {
      skip: !id,
      onError: (error) => SentryLogger.error('Failed to fetch video', 'VideoTilePublisher', error, { video: { id } }),
    })
    const { isLoadingThumbnail, thumbnailPhotoUrl, videoHref } = useVideoTileSharedLogic(video)
    const navigate = useNavigate()

    const hasNft = !!video?.nft

    const nftActions = useNftActions()
    const owner = video?.nft?.ownerMember?.id !== video?.channel.ownerMember?.id ? video?.nft?.ownerMember : undefined

    const ownerAvatar = useMemberAvatar(video?.nft?.ownerMember)

    const nftStatus = getNftStatus(video?.nft, video)

    const nftState = useNftState(video?.nft)
    const { auctionPlannedEndDate, englishTimerState, needsSettling, startsAtDate, timerLoading } = nftState
    const nftTilePublisher = useGetNftSlot({
      auctionPlannedEndDate,
      status: nftStatus?.status,
      englishTimerState,
      needsSettling,
      startsAtDate,
      withNftLabel: !!video?.nft,
      timerLoading,
    })
    const isAuction = nftStatus?.status === 'auction'
    const contextMenuItems = useVideoContextMenu({
      publisher: true,
      nftState,
      hasNft: !!video?.nft,
      nftActions,
      videoId: video?.id,
      videoHref,
      buyNowPrice: isAuction || nftStatus?.status === 'buy-now' ? nftStatus.buyNowPrice : undefined,
      topBid: isAuction ? nftStatus.topBidAmount : undefined,
      startingPrice: isAuction ? nftStatus.startingPrice : undefined,
      onDeleteVideoClick,
      onEditClick,
      onMintNftClick,
      hasBids:
        isAuction && !!nftStatus.topBidder && !!(isAuction && !nftStatus.topBid?.isCanceled && nftStatus.topBidAmount),
    })

    const uploadVideoStatus = useUploadsStore((state) => state.uploadsStatus[video?.media?.id || ''])
    const uploadThumbnailStatus = useUploadsStore((state) => state.uploadsStatus[video?.thumbnailPhoto?.id || ''])

    const isVideoUploading =
      uploadVideoStatus?.lastStatus === 'inProgress' ||
      uploadVideoStatus?.lastStatus === 'processing' ||
      uploadVideoStatus?.lastStatus === 'reconnecting'

    const isThumbnailUploading =
      uploadThumbnailStatus?.lastStatus === 'inProgress' ||
      uploadThumbnailStatus?.lastStatus === 'processing' ||
      uploadThumbnailStatus?.lastStatus === 'reconnecting'
    const isUploading = isVideoUploading || isThumbnailUploading

    const hasThumbnailUploadFailed =
      (video?.thumbnailPhoto &&
        !video.thumbnailPhoto.isAccepted &&
        uploadThumbnailStatus?.lastStatus !== 'completed') ||
      false
    const hasVideoUploadFailed =
      (video?.media && !video.media.isAccepted && uploadVideoStatus?.lastStatus !== 'completed') || false

    const hasAssetUploadFailed = (hasThumbnailUploadFailed || hasVideoUploadFailed) && !isUploading

    const isUnlisted = video?.isPublic === false

    const getSlots = useCallback<() => undefined | SlotsObject>(() => {
      if ((isUploading && !hasAssetUploadFailed) || loading) {
        return
      }
      const slots: SlotsObject = {
        bottomRight: {
          element: video?.duration ? <Pill variant="overlay" label={formatDurationShort(video?.duration)} /> : null,
        },
        bottomLeft: video?.nft ? nftTilePublisher : undefined,
        topLeft: owner
          ? {
              element: (
                <OwnerPill
                  onClick={(e) => {
                    e?.preventDefault()
                    navigate(absoluteRoutes.viewer.member(owner.handle))
                  }}
                  avatar={{ assetUrl: ownerAvatar.url, loading: ownerAvatar.isLoadingAsset }}
                  handle={owner.handle}
                  title={owner.handle}
                />
              ),
              clickable: true,
              halfWidth: true,
            }
          : undefined,
        topRight: {
          element: <Button icon={<SvgActionEdit />} size="small" onClick={onEditClick} />,
          clickable: true,
          type: 'hover',
        },
        center: {
          element: <SvgIllustrativePlay />,
          type: 'hover',
        },
      }
      if (hasAssetUploadFailed) {
        slots.bottomRight = {
          element: <Pill variant="danger" label="Failed upload" icon={<SvgActionWarning />} />,
        }
        slots.center = {
          element: <SvgIllustrativeReupload />,
          type: 'hover',
        }
        slots.topRight = undefined
        slots.bottomLeft = nftTilePublisher
      }
      if (isUnlisted) {
        slots.bottomLeft = nftTilePublisher && {
          element: <Pill variant="overlay" label="Unlisted" icon={<SvgActionHide />} />,
        }
      }
      return slots
    }, [
      hasAssetUploadFailed,
      isUnlisted,
      isUploading,
      loading,
      navigate,
      nftTilePublisher,
      onEditClick,
      owner,
      ownerAvatar.isLoadingAsset,
      ownerAvatar.url,
      video?.duration,
      video?.nft,
    ])

    const getPublisherKebabMenuItems = useCallback(() => {
      if (isUploading && !hasAssetUploadFailed) {
        return
      }
      const assetFailedKebabItems = [
        {
          nodeStart: <SvgActionReupload />,
          onClick: onReuploadVideoClick,
          label: 'Reupload file',
        },
        ...(!hasNft
          ? [
              {
                nodeStart: <SvgActionTrash />,
                onClick: onDeleteVideoClick,
                label: 'Delete video',
                destructive: true,
              },
            ]
          : []),
      ]

      return hasAssetUploadFailed ? assetFailedKebabItems : contextMenuItems
    }, [isUploading, hasAssetUploadFailed, onReuploadVideoClick, hasNft, onDeleteVideoClick, contextMenuItems])

    const getVideoSubtitle = useCallback(() => {
      if (hasAssetUploadFailed) {
        return 'Upload failed...'
      }
      if (uploadVideoStatus?.lastStatus === 'inProgress' || uploadThumbnailStatus?.lastStatus === 'inProgress') {
        return 'Uploading...'
      }
      if (uploadVideoStatus?.lastStatus === 'processing' || uploadThumbnailStatus?.lastStatus === 'processing') {
        return 'Processing...'
      }
      return
    }, [hasAssetUploadFailed, uploadThumbnailStatus?.lastStatus, uploadVideoStatus?.lastStatus])

    const getAllFilesLasStatus = useCallback(() => {
      if (uploadVideoStatus?.lastStatus === 'inProgress' || uploadThumbnailStatus?.lastStatus === 'inProgress') {
        return 'inProgress'
      }
      if (uploadVideoStatus?.lastStatus === 'processing' || uploadThumbnailStatus?.lastStatus === 'processing') {
        return 'processing'
      }
      if (uploadVideoStatus?.lastStatus === 'completed' || uploadThumbnailStatus?.lastStatus === 'completed') {
        return 'completed'
      }
    }, [uploadThumbnailStatus?.lastStatus, uploadVideoStatus?.lastStatus])

    const getContentSlot = () => {
      return (
        <CSSTransition
          in={isUploading && !hasAssetUploadFailed}
          timeout={1000}
          classNames={DELAYED_FADE_CLASSNAME}
          unmountOnExit
          mountOnEnter
        >
          <UploadProgressTransition>
            <UploadProgressBar
              progress={uploadVideoStatus?.progress || uploadThumbnailStatus?.progress}
              lastStatus={getAllFilesLasStatus()}
              withLoadingIndicator
            />
          </UploadProgressTransition>
        </CSSTransition>
      )
    }

    return (
      <VideoTile
        clickable={!isUploading || hasAssetUploadFailed}
        slots={getSlots()}
        contentSlot={getContentSlot()}
        videoHref={hasAssetUploadFailed || isUploading ? absoluteRoutes.studio.uploads() : videoHref}
        linkState={hasAssetUploadFailed ? { highlightVideoId: video?.id } : undefined}
        videoSubTitle={getVideoSubtitle()}
        detailsVariant="withoutChannel"
        loadingDetails={loading || !video}
        loadingThumbnail={isLoadingThumbnail && !hasThumbnailUploadFailed}
        thumbnailUrl={thumbnailPhotoUrl}
        createdAt={video?.createdAt}
        videoTitle={video?.title}
        views={video?.views}
        kebabMenuItems={getPublisherKebabMenuItems()}
      />
    )
  }
)

export const UploadProgressTransition = styled.div`
  &.${DELAYED_FADE_CLASSNAME}-enter {
    opacity: 0;
  }

  &.${DELAYED_FADE_CLASSNAME}-enter-active {
    opacity: 1;
    transition: opacity 200ms ease-out;
  }

  &.${DELAYED_FADE_CLASSNAME}-exit {
    opacity: 1;
  }

  &.${DELAYED_FADE_CLASSNAME}-exit-active {
    opacity: 0;
    transition: opacity 400ms ease-out 600ms;
  }
`

VideoTilePublisher.displayName = 'VideoTilePublisher'
