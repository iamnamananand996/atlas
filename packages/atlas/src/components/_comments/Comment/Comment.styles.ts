import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

import { Text } from '@/components/Text'
import { Button } from '@/components/_buttons/Button'
import { SvgActionTrash } from '@/components/_icons'
import { SkeletonLoader } from '@/components/_loaders/SkeletonLoader'
import { cVar, sizes, square } from '@/styles'

export const KebabMenuIconButton = styled(Button)<{ isActive: boolean }>`
  opacity: 0;
  pointer-events: ${({ isActive }) => (isActive ? 'auto' : 'none')};

  @media (any-pointer: coarse) {
    opacity: ${({ isActive }) => (isActive ? 1 : 0)};
  }
`

export const CommentWrapper = styled.div<{ shouldShowKebabButton: boolean }>`
  display: grid;
  gap: ${sizes(3)};
  align-items: start;

  /* comment content, kebab button */
  grid-template-columns: 1fr auto;

  :hover {
    ${KebabMenuIconButton} {
      opacity: ${({ shouldShowKebabButton: isActive }) => (isActive ? 1 : 0)};
    }
  }
`

export const CommentHeader = styled.div<{ isDeleted: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: ${({ isDeleted }) => (isDeleted ? sizes(3) : sizes(2))};
`

export const StyledLink = styled(Link)`
  text-decoration: none;
`

export const CommentHeaderDot = styled.div`
  background-color: ${cVar('colorBackgroundAlpha')};
  border-radius: 100%;

  ${square(4)};
`

export const HighlightableText = styled(Text)`
  cursor: pointer;

  :hover {
    transition: color ${cVar('animationTransitionFast')};
    color: ${cVar('colorTextStrong')};
  }
`

export const StyledSvgActionTrash = styled(SvgActionTrash)`
  margin-right: ${sizes(2)};

  path {
    fill: ${cVar('colorTextMuted')};
  }
`

export const DeletedComment = styled(Text)`
  display: flex;
  white-space: pre-line;
  align-items: center;
`

export const CommentFooter = styled.div`
  margin-top: ${sizes(2)};
`

export const CommentFooterItems = styled.div`
  display: inline-grid;
  grid-auto-flow: column;
  gap: 4px;
`

export const StyledFooterSkeletonLoader = styled(SkeletonLoader)`
  border-radius: 999px;
`
