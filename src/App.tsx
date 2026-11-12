import { GuildProvider } from './components/GuildProvider';
import GuildHome from './components/GuildHome';
import OAuthConsent from './components/OAuthConsent';
import GuildMemberHub from './components/GuildMemberHub';
import GuildCommunity from './components/GuildCommunity';

export default function App() {
  return <GuildProvider>
    {window.location.pathname === '/oauth/consent' ? <OAuthConsent /> : window.location.pathname.startsWith('/community') ? <GuildCommunity /> : (window.location.pathname === '/me' || window.location.pathname.startsWith('/adventurers/')) ? <GuildMemberHub /> : <GuildHome />}
  </GuildProvider>;
}
