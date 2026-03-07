import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import { ThemeProvider } from '../context/ThemeContext'
import ToastContainer from '../components/ui/ToastContainer'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          {getLayout(<Component {...pageProps} />)}
          <ToastContainer />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}