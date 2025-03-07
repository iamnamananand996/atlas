import { css } from '@emotion/react'

import { cVar, sizes } from '@/styles'

export type InputSize = 'medium' | 'large'

export type NodeWidthProps = {
  leftNodeWidth?: number
  rightNodeWidth?: number
}

export const inputBorderColors = {
  default: cVar('colorBorderAlpha'),
  hover: cVar('colorBorderStrongAlpha'),
  error: cVar('colorBorderError'),
  focus: cVar('colorBorderPrimary'),
}

export const getSharedInputStyles = (ignoreBoxShadow?: boolean) => ({
  default: css`
    /* inherit from Text component font size and color */
    font-size: inherit;
    color: inherit;

    /* line height needs to be set for inputs explicitly */
    line-height: ${sizes(6)};
    border: none;
    caret-color: ${cVar('colorBackgroundPrimary')};
    background-color: ${cVar('colorBackgroundMutedAlpha')};
    transition: ${cVar('animationTransitionFast')};
    transition-property: background-color, color, box-shadow;
    box-shadow: inset 0 -1px 0 0 ${ignoreBoxShadow ? 'transparent' : inputBorderColors.default};

    /* ios specific - fixes issue with missing box-shadow and rounded corners in input component */
    border-radius: 0;
    appearance: none;

    ::placeholder {
      font: inherit;
      color: ${cVar('colorTextMuted')};

      /* Firefox sets opacity of placeholders to less than 1, that's why we need to set this */
      opacity: 1;
    }
  `,
  hover: css`
    background-color: ${cVar('colorBackgroundAlpha')};
    box-shadow: inset 0 -1px 0 0 ${ignoreBoxShadow ? 'transparent' : inputBorderColors.hover};
  `,
  error: css`
    box-shadow: inset 0 -1px 0 0 ${ignoreBoxShadow ? 'transparent' : inputBorderColors.error};
  `,
  disabled: css`
    opacity: 0.5;
    background-color: ${cVar('colorBackgroundMutedAlpha')};
    cursor: not-allowed;
  `,
  focus: css`
    background-color: ${cVar('colorBackgroundMutedAlpha')};
    box-shadow: inset 0 -2px 0 0 ${ignoreBoxShadow ? 'transparent' : inputBorderColors.focus};
  `,
})

export const horizontalPadding = {
  medium: sizes(4, true),
  large: sizes(5, true),
} as const

export const verticalPadding = {
  medium: sizes(2, true),
  large: sizes(3, true),
} as const

type GetInputPaddingParams = {
  inputSize: InputSize
} & NodeWidthProps

export const getInputPadding = ({ inputSize, leftNodeWidth, rightNodeWidth }: GetInputPaddingParams) => {
  const paddingLeft = leftNodeWidth ? leftNodeWidth + sizes(2, true) : horizontalPadding[inputSize]

  const paddingRight = rightNodeWidth ? rightNodeWidth + sizes(2, true) : horizontalPadding[inputSize]

  return css`
    padding: ${verticalPadding[inputSize]}px ${paddingRight}px ${verticalPadding[inputSize]}px ${paddingLeft}px;
  `
}

export const getBaseInputStyles = ({ error, ignoreBoxShadow }: { error?: boolean; ignoreBoxShadow?: boolean }) => css`
  ${getSharedInputStyles(ignoreBoxShadow).default};

  :disabled {
    ${getSharedInputStyles(ignoreBoxShadow).disabled};
  }

  :hover:not(:disabled) {
    ${getSharedInputStyles(ignoreBoxShadow).hover};
  }

  :focus:not(:disabled) {
    ${getSharedInputStyles(ignoreBoxShadow).focus};
  }

  ${error && getSharedInputStyles(ignoreBoxShadow).error};
`
