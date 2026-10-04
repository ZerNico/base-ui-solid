import { SearchDialog } from './Search/SearchDialog';
import { Logo } from './Logo';
import { SkipNav } from './SkipNav';
import './Header.css';
import { RouterLink } from './RouterLink';

export const HEADER_HEIGHT_DESKTOP = 64;
export function Header() {
  return (
    <header class="Header">
      <div class="HeaderInner">
        <SkipNav>Skip to contents</SkipNav>
        <RouterLink class="HeaderLogoLink" href="/" aria-label="Go to the homepage">
          <Logo aria-label="Base UI Solid" />
        </RouterLink>
        <div class="HeaderSearch">
          <SearchDialog />
        </div>
      </div>
    </header>
  );
}
