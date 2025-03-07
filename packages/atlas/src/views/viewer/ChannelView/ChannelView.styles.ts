import { css } from '@emotion/react'
import styled from '@emotion/styled'

import { Tabs } from '@/components/Tabs'
import { Text } from '@/components/Text'
import { Button } from '@/components/_buttons/Button'
import { ChannelLink } from '@/components/_channel/ChannelLink'
import { Select } from '@/components/_inputs/Select'
import { SkeletonLoader } from '@/components/_loaders/SkeletonLoader'
import { cVar, media, sizes, transitions, zIndex } from '@/styles'

import { TABS } from './utils'

const SM_TITLE_HEIGHT = '44px'
const TITLE_HEIGHT = '51px'
const SM_SUBTITLE_HEIGHT = '24px'
const SUBTITLE_HEIGHT = '27px'

export const TitleSection = styled.div`
  margin-top: -${sizes(6)};
  display: grid;
  grid-template-rows: repeat(auto, 3);
  grid-template-columns: 1fr;
  grid-row-gap: ${sizes(6)};
  justify-items: center;
  width: 100%;

  ${media.sm} {
    margin-top: 0;
    grid-template-columns: min-content 1fr auto;
  }
`

export const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  z-index: 2;
  justify-self: stretch;
  justify-content: center;

  ${media.sm} {
    align-items: normal;
    margin-left: ${sizes(6)};
  }
`

export const StyledSelect = styled(Select)`
  grid-area: sort;

  ${media.sm} {
    grid-area: initial;
  }
`

export const FilterButton = styled(Button)`
  grid-area: filter;
  grid-gap: 8px;

  ${media.sm} {
    grid-area: initial;
  }
`

export const SubTitle = styled(Text)`
  margin: ${sizes(2)} 0;
  display: inline-block;
`

export const StyledChannelLink = styled(ChannelLink)`
  position: relative;
  width: fit-content;
  justify-self: start;
  border: solid 8px ${cVar('colorCoreBaseBlack')};
  border-radius: 100%;
  ${media.sm} {
    border: none;
    margin: 0;
  }
`

export const TitleSkeletonLoader = styled(SkeletonLoader)`
  width: 300px;
  height: ${SM_TITLE_HEIGHT};

  ${media.md} {
    height: ${TITLE_HEIGHT};
  }
`

export const SubTitleSkeletonLoader = styled(SkeletonLoader)`
  width: 140px;
  margin-top: ${sizes(2)};
  height: ${SM_SUBTITLE_HEIGHT};

  ${media.md} {
    height: ${SUBTITLE_HEIGHT};
  }
`
export const StyledButtonContainer = styled.div`
  width: 100%;
  display: grid;
  gap: ${sizes(2)};
  align-items: center;

  /* 1fr - follow button, auto - kebab menu */
  grid-template-columns: 1fr auto;

  ${media.sm} {
    width: auto;
    grid-column: initial;
    align-self: center;
    grid-template-columns: auto auto;
  }
`

export const StyledButton = styled(Button)`
  width: 100%;
`

export const TabsWrapper = styled.div<{ isFiltersOpen: boolean }>`
  z-index: ${zIndex.transactionBar};
  position: relative;
  margin-bottom: ${sizes(8)};

  ${media.sm} {
    margin-bottom: ${({ isFiltersOpen }) => sizes(isFiltersOpen ? 30 : 12)};
    transition: margin-bottom ${transitions.timings.routing} ${transitions.easing};
  }
`

type TabsContainerProps = {
  tab: typeof TABS[number]
}

const geTabsContainerGridTemplate = ({ tab }: TabsContainerProps) => {
  switch (tab) {
    case 'Videos':
    case 'Information':
      return css`
        grid-template:
          'tabs tabs tabs' 1fr
          'search search search' auto
          'sort sort sort' auto / 1fr 1fr;
        ${media.sm} {
          grid-template: 1fr / auto 1fr 180px;
        }
      `
    case 'NFTs':
      return css`
        grid-template:
          'tabs tabs tabs' 1fr
          'search search search' auto
          'sort sort filter' auto / 1fr 1fr;
        ${media.sm} {
          grid-template: 1fr / 1fr 180px 99px;
        }
      `
  }
}

export const TabsContainer = styled.div<TabsContainerProps>`
  display: grid;
  padding-top: ${sizes(8)};
  gap: ${sizes(4)};
  background-color: #000;

  ${media.sm} {
    align-items: flex-start;
    box-shadow: ${cVar('effectDividersBottom')};
  }

  ${geTabsContainerGridTemplate}
`

export const StyledTabs = styled(Tabs)`
  grid-area: tabs;
  border-bottom: solid 1px ${cVar('colorCoreNeutral700')};

  ${media.sm} {
    border-bottom: none;
    grid-area: initial;
  }
`

export const NotFoundChannelContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - var(--size-topbar-height));
`

export const CollectorsBoxContainer = styled.div`
  display: flex;
  height: 64px;
  flex-direction: row-reverse;
  margin-top: -${sizes(8)};
`
