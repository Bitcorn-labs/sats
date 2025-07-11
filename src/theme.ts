import { createTheme } from '@mui/material/styles';

// Define your theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Set the mode to dark
    primary: {
      main: '#1976d2', // Adjust primary color as needed
    },
    error: {
      main: '#f44336', // Set a specific shade of red for error
    },
  },
  components: {
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#2b2b2b', // Default background color
          border: '1px solid lightgrey', // Add grey border
          '&:hover': {
            backgroundColor: '#333333', // Change on hover
            borderColor: 'lightgrey', // Maintain border color on hover
          },
          '&.Mui-focused': {
            backgroundColor: '#2b2b2b', // Same background on focus
            borderColor: '#646cffaa', // Change border color on focus
            boxShadow: '0 0 0 2px #646cffaa', // Optional: add a shadow
          },
          '&.Mui-error': {
            borderColor: '#f44336', // Change border color to red when error
            backgroundColor: '#2b2b2b', // Keep the same background on error
          },
          '&.Mui-error.Mui-focused': {
            borderColor: '#f44336', // Change border color to red when error and focused
            boxShadow: '0 0 0 2px rgba(244, 67, 54, 0.5)', // Optional: add a shadow for focused error
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: 'lightgrey', // Default label color
          '&.Mui-focused': {
            color: 'lightgrey', // Ensure the focused label is the same color
          },
          '&.Mui-error': {
            color: '#f44336', // Change label color to red when error
          },
        },
      },
    },
  },
});

export default theme;
