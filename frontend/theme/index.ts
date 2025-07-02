import { ThemeConfig } from 'antd';

export const mainTheme: ThemeConfig = {
  token: {
    colorLink: '#7E22CE',
    colorPrimary: '#7E22CE',
    colorWarning: '#FF9C27',
    colorInfoText: '#36075F',
    colorText: '#0F172A',
    colorTextSecondary: '#4D596A',
    colorFillSecondary: '#E4E4E4',
    fontSize: 16,
    fontFamily: 'Inter',
    colorBgContainer: '#FFFFFF',
  },
  components: {
    Alert: {
      fontSize: 16,
    },
    Button: {
      contentFontSizeSM: 14,
      paddingInlineSM: 12,
      fontSize: 16,
      fontSizeLG: 16,
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      padding: 20,
      fontWeightStrong: 400,
      colorBorderSecondary: '#E4E4E4',
    },
    Input: {
      fontSize: 20,
      colorTextDisabled: '#334155',
    },
    Tooltip: {
      fontSize: 16,
      colorText: 'black',
      colorTextLightSolid: 'black',
      colorBgSpotlight: 'white',
    },
    Typography: {
      colorTextDescription: '#4D596A',
    },
    Popover: {
      fontSize: 14,
    },
    Tag: {
      colorSuccess: '#135200',
    },
    List: {
      colorBorder: '#DFE5EE',
    },
    Steps: {
      fontSize: 16,
      colorError: '#CF1322',
    },
    Result: {
      iconFontSize: 48,
    },
  },
};

// TODO: consolidate theme into mainTheme
export const LOCAL_FORM_THEME = { components: { Input: { fontSize: 16 } } };
