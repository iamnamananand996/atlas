import { css } from '@emotion/react'
import styled from '@emotion/styled'

import { smallBadgeStyles } from '@/components/Badge'
import { cVar, sizes, zIndex } from '@/styles'

import { Pill } from '../Pill'
import { Button } from '../_buttons/Button'

export const TabsWrapper = styled.div`
  position: relative;
  width: 100%;
`

type TabsGroupProps = {
  'data-underline': boolean
  shadowsVisible: {
    left: boolean
    right: boolean
  }
}

const getMaskImage = ({ shadowsVisible }: TabsGroupProps) => {
  if (shadowsVisible.left && shadowsVisible.right) {
    return css`
      mask-image: linear-gradient(to left, transparent 5%, black 25%, black 75%, transparent 95%);
    `
  }
  if (shadowsVisible.left) {
    return css`
      mask-image: linear-gradient(90deg, rgb(0 0 0 / 0) 5%, rgb(0 0 0 / 1) 25%);
    `
  }
  if (shadowsVisible.right) {
    return css`
      mask-image: linear-gradient(270deg, rgb(0 0 0 / 0) 5%, rgb(0 0 0 / 1) 25%);
    `
  }
}
export const TabsGroup = styled.div<TabsGroupProps>`
  display: flex;
  position: relative;
  scroll-behavior: smooth;
  overflow: auto;
  ${getMaskImage}

  ::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;

  &[data-underline='true'] {
    box-shadow: ${cVar('effectDividersBottom')};
  }
`

type TabProps = {
  selected: boolean
}

export const Tab = styled.div<TabProps>`
  transition: box-shadow ${cVar('animationTransitionFast')}, color ${cVar('animationTransitionFast')};
  padding: ${sizes(2.5)} ${sizes(4)} 0 ${sizes(4)};
  height: 56px;
  display: flex;
  box-shadow: ${({ selected }) => (selected ? `inset 0 -4px 0 ${cVar('colorBackgroundPrimary')};` : 'none')};
  flex-shrink: 0;

  :hover,
  :focus {
    box-shadow: inset 0 -4px 0 ${({ selected }) => (selected ? cVar('colorBackgroundPrimary') : cVar('colorBorderStrong'))};
    cursor: pointer;
  }

  span {
    ${smallBadgeStyles}

    &[data-badge]::after {
      margin-top: -${sizes(2.5)};
    }
  }
`

type ButtonWrapperProps = {
  direction: 'prev' | 'next'
}

export const ButtonWrapper = styled.div<ButtonWrapperProps>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${(props) => (props.direction === 'prev' ? 0 : 'auto')};
  right: ${(props) => (props.direction === 'next' ? 0 : 'auto')};
  width: 20%;
  z-index: ${zIndex.overlay};
  pointer-events: none;
`

export const StyledPill = styled(Pill)`
  margin-left: ${sizes(2)};
`

export const StyledButton = styled(Button)<{ 'data-right'?: boolean }>`
  pointer-events: all;
  margin-top: ${sizes(1)};

  &[data-right='true'] {
    float: right;
  }
`
