import { ThemeConfig } from 'antd';

import { COLOR } from '@/constants/colors';

export const mainTheme: ThemeConfig = {
  token: {
    colorLink: COLOR.PRIMARY,
    colorPrimary: COLOR.PRIMARY,
    colorWarning: '#FF9C27',
    colorInfoText: '#36075F',
    colorText: '#0F172A',
    colorTextSecondary: COLOR.TEXT_NEUTRAL_SECONDARY,
    colorFillSecondary: '#E4E4E4',
    fontSize: 16,
    fontFamily: 'Inter',
    colorBgContainer: '#FFFFFF',
    fontSizeHeading3: 24,
    fontSizeHeading5: 20,
    lineHeightHeading5: 1.4,
    fontWeightStrong: 500,
  },
  components: {
    Alert: {
      fontSize: 16,
      colorIcon: COLOR.TEXT_NEUTRAL_PRIMARY,
      fontSizeIcon: 16,
    },
    Button: {
      contentFontSizeSM: 14,
      paddingInlineSM: 12,
      fontSize: 16,
      fontSizeLG: 16,

      // For "primary" buttons
      colorPrimary: '#7e22ce',
      colorPrimaryHover: '#6a1cb1',
      colorPrimaryActive: '#5c1a9e',
      colorTextLightSolid: '#ffffff',
      colorTextDisabled: '#ffffff',

      dangerColor: COLOR.TEXT_COLOR.ERROR.DEFAULT,

      // For "default" buttons
      colorText: '#000000',
      colorBorder: '#dfe6ec',
      colorBgBase: '#ffffff',
      colorBgTextActive: '#dfe6ec',
      colorBgTextHover: 'transparent',

      // For "link" buttons
      colorLink: '#000000',
      colorLinkHover: '#000000',
      colorLinkActive: '#000000',
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      padding: 20,
      fontWeightStrong: 400,
      colorBorderSecondary: '#E4E4E4',
      borderRadiusLG: 10,
    },
    Input: {
      fontSize: 16,
      colorTextDisabled: '#334155',
      paddingBlock: 8,
      paddingInline: 8,
      colorBgContainer: COLOR.BACKGROUND,
      colorBorder: COLOR.GRAY_4,
      hoverBorderColor: COLOR.GRAY_3,
    },
    Menu: {
      activeBarBorderWidth: 0,
      itemSelectedBg: COLOR.GRAY_1,
      itemHoverBg: COLOR.GRAY_1,
      itemSelectedColor: COLOR.TEXT_NEUTRAL_PRIMARY,
      itemMarginInline: 0,
    },
    List: {
      colorBorder: '#DFE5EE',
    },
    Layout: {
      bodyBg: COLOR.BACKGROUND,
    },
    Popover: {
      fontSize: 14,
    },
    Result: {
      iconFontSize: 48,
    },
    Select: {
      colorBgContainer: COLOR.BACKGROUND,
      fontSizeLG: 16,
      optionPadding: 8,
    },
    Steps: {
      fontSize: 16,
      colorError: '#CF1322',
    },
    Segmented: {
      trackPadding: 0,
      trackBg: COLOR.GRAY_1,
      itemHoverBg: COLOR.GRAY_3,
      itemActiveBg: COLOR.GRAY_3,
      borderRadiusLG: 10,
      controlPaddingHorizontal: 16,
      fontSizeLG: 16,
    },
    Table: {
      padding: 12,
      headerColor: '#1F2229',
      headerBg: '#F2F4F9',
      borderColor: '#DFE5EE',
    },
    Tag: {
      defaultBg: COLOR.GRAY_1,
      colorSuccess: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
      colorSuccessBg: COLOR.BG.SUCCESS.DEFAULT,
      borderRadius: 8,
    },
    Tooltip: {
      fontSize: 14,
      colorText: 'black',
      colorTextLightSolid: 'black',
      colorBgSpotlight: 'white',
    },
    Typography: {
      colorTextHeading: COLOR.TEXT_NEUTRAL_PRIMARY,
      colorTextDescription: COLOR.TEXT_NEUTRAL_SECONDARY,
      colorError: COLOR.TEXT_COLOR.ERROR.DEFAULT,
    },
  },
};
