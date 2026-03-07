import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import ToastContainer from '../components/ui/ToastContainer'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout ?? ((page) => page)

  return (
    <AuthProvider>
      <NotificationProvider>
        {getLayout(<Component {...pageProps} />)}
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  )
}
