import { GuildProvider } from './components/GuildProvider';
import GuildHome from './components/GuildHome';
import OAuthConsent from './components/OAuthConsent';

export default function App() {
  return <GuildProvider>
    {window.location.pathname === '/oauth/consent' ? <OAuthConsent /> : <GuildHome />}
  </GuildProvider>;
}
