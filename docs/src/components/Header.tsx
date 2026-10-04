import { SearchDialog } from './Search/SearchDialog';
import { Logo } from './Logo';
import { SkipNav } from './SkipNav';
import './Header.css';

export const HEADER_HEIGHT_DESKTOP = 64;
export function Header() {
  return (
    <header class="Header">
      <div class="HeaderInner">
        <SkipNav>Skip to contents</SkipNav>
        <a class="HeaderLogoLink" href="/" aria-label="Go to the homepage">
          <Logo aria-label="Base UI Solid" />
        </a>
        <div class="HeaderSearch">
          <SearchDialog />
        </div>
      </div>
    </header>
  );
}
