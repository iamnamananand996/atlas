import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'

import { useMemberships } from '@/api/hooks/membership'
import { useNftsConnection } from '@/api/hooks/nfts'
import { OwnedNftOrderByInput } from '@/api/queries/__generated__/baseTypes.generated'
import { SvgActionFilters } from '@/assets/icons'
import { EmptyFallback } from '@/components/EmptyFallback'
import { FiltersBar, useFiltersBar } from '@/components/FiltersBar'
import { LimitedWidthContainer } from '@/components/LimitedWidthContainer'
import { ViewErrorFallback } from '@/components/ViewErrorFallback'
import { ViewWrapper } from '@/components/ViewWrapper'
import { Button } from '@/components/_buttons/Button'
import { Select } from '@/components/_inputs/Select'
import { absoluteRoutes } from '@/config/routes'
import { NFT_SORT_OPTIONS } from '@/config/sorting'
import { useHeadTags } from '@/hooks/useHeadTags'
import { useMemberAvatar } from '@/providers/assets/assets.hooks'
import { useUser } from '@/providers/user/user.hooks'
import { SentryLogger } from '@/utils/logs'

import { MemberAbout } from './MemberAbout'
import { MemberActivity } from './MemberActivity'
import { MemberNFTs } from './MemberNFTs'
import {
  FilterButtonContainer,
  NotFoundMemberContainer,
  SortContainer,
  StyledMembershipInfo,
  StyledTabs,
  TabsContainer,
  TabsWrapper,
} from './MemberView.styles'

const TABS = ['NFTs owned', 'Activity', 'About'] as const

export const MemberView: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTabName = searchParams.get('tab') as typeof TABS[number] | null
  const [sortBy, setSortBy] = useState<OwnedNftOrderByInput>(OwnedNftOrderByInput.CreatedAtDesc)
  const [currentTab, setCurrentTab] = useState<typeof TABS[number] | null>(null)
  const { memberId, activeMembership } = useUser()
  const { handle } = useParams()
  const headTags = useHeadTags(handle)
  const filtersBarLogic = useFiltersBar()
  const {
    filters: { setIsFiltersOpen, isFiltersOpen },
    ownedNftWhereInput,
    canClearFilters: { canClearAllFilters },
  } = filtersBarLogic

  const { nfts, loading } = useNftsConnection(
    {
      where: {
        ownerMember: { handle_eq: handle },
        ...ownedNftWhereInput,
        video: {
          isPublic_eq: handle !== activeMembership?.handle || undefined,
        },
      },
      orderBy: sortBy as OwnedNftOrderByInput,
    },
    { skip: !handle }
  )

  const {
    memberships,
    error,
    loading: loadingMember,
  } = useMemberships(
    { where: { handle_eq: handle } },
    {
      onError: (error) => SentryLogger.error('Failed to fetch memberships', 'ActiveUserProvider', error),
    }
  )
  const member = memberships?.find((member) => member.handle === handle)
  const { url: avatarUrl, isLoadingAsset: avatarLoading } = useMemberAvatar(member)

  const toggleFilters = () => {
    setIsFiltersOpen((value) => !value)
  }
  const handleSorting = (value?: OwnedNftOrderByInput | null) => {
    if (value) {
      setSortBy(value)
    }
  }
  const handleSetCurrentTab = async (tab: number) => {
    setSearchParams({ 'tab': TABS[tab] }, { replace: true })
  }

  const mappedTabs = TABS.map((tab) => ({
    name: tab,
    pillText: tab === 'NFTs owned' && nfts && nfts.length ? nfts.length : undefined,
  }))
  const tabContent = useMemo(() => {
    switch (currentTab) {
      case 'NFTs owned':
        return (
          <MemberNFTs
            isFiltersApplied={canClearAllFilters}
            nfts={nfts}
            loading={loading}
            owner={activeMembership?.handle === handle}
          />
        )
      case 'Activity':
        return <MemberActivity memberId={member?.id} sort={sortBy as 'createdAt_ASC' | 'createdAt_DESC'} />
      case 'About':
        return <MemberAbout />
    }
  }, [activeMembership?.handle, canClearAllFilters, currentTab, handle, loading, member?.id, nfts, sortBy])

  // At mount set the tab from the search params
  const initialRender = useRef(true)
  useEffect(() => {
    if (initialRender.current) {
      const tabIndex = TABS.findIndex((t) => t === currentTabName)
      if (tabIndex === -1) setSearchParams({ 'tab': TABS[0] }, { replace: true })
      initialRender.current = false
    }
  })

  useEffect(() => {
    if (currentTabName) {
      setSortBy(OwnedNftOrderByInput.CreatedAtDesc)
      setCurrentTab(currentTabName)
      setIsFiltersOpen(false)
    }
  }, [currentTabName, setIsFiltersOpen])

  if (!loadingMember && !member) {
    return (
      <NotFoundMemberContainer>
        <EmptyFallback
          title="Member not found"
          button={
            <Button variant="secondary" size="large" to={absoluteRoutes.viewer.index()}>
              Go back to home page
            </Button>
          }
        />
      </NotFoundMemberContainer>
    )
  }
  if (error) {
    return <ViewErrorFallback />
  }
  return (
    <ViewWrapper>
      {headTags}
      <LimitedWidthContainer>
        <StyledMembershipInfo
          avatarUrl={avatarUrl}
          avatarLoading={avatarLoading}
          handle={member?.handle}
          address={member?.controllerAccount}
          loading={loadingMember}
          isOwner={memberId === member?.id}
        />
        <TabsWrapper isFiltersOpen={isFiltersOpen}>
          <TabsContainer isMemberActivityTab={currentTab === 'Activity'}>
            <StyledTabs
              selected={TABS.findIndex((x) => x === currentTab)}
              initialIndex={0}
              tabs={mappedTabs}
              onSelectTab={handleSetCurrentTab}
            />
            {currentTab && ['NFTs owned', 'Activity'].includes(currentTab) && (
              <SortContainer>
                <Select
                  size="medium"
                  inlineLabel="Sort by"
                  value={sortBy}
                  items={NFT_SORT_OPTIONS}
                  onChange={handleSorting}
                />
              </SortContainer>
            )}
            {currentTab === 'NFTs owned' && (
              <FilterButtonContainer>
                <Button
                  badge={canClearAllFilters}
                  variant="secondary"
                  icon={<SvgActionFilters />}
                  onClick={toggleFilters}
                >
                  Filters
                </Button>
              </FilterButtonContainer>
            )}
          </TabsContainer>
          <FiltersBar {...filtersBarLogic} activeFilters={['nftStatus']} />
        </TabsWrapper>
        {tabContent}
      </LimitedWidthContainer>
    </ViewWrapper>
  )
}
