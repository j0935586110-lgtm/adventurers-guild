import { GuildProvider } from './components/GuildProvider';
import GuildChatHome from './components/GuildChatHome';
import OAuthConsent from './components/OAuthConsent';
import GuildMemberHub from './components/GuildMemberHub';
import GuildCommunity from './components/GuildCommunity';
import GuildAiHub from './components/GuildAiHub';
import GuildAgentConnect from './components/GuildAgentConnect';

export default function App() {
  return <GuildProvider>
    {window.location.pathname === '/oauth/consent' ? <OAuthConsent /> : window.location.pathname.startsWith('/community') ? <GuildCommunity /> : window.location.pathname === '/ai' ? <GuildAiHub /> : window.location.pathname === '/connect' ? <GuildAgentConnect /> : (window.location.pathname === '/me' || window.location.pathname.startsWith('/adventurers/')) ? <GuildMemberHub /> : <GuildChatHome />}
  </GuildProvider>;
}
