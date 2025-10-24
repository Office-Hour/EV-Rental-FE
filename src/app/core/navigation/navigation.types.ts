import { NavigationItem } from '../../shared/services/navigation/navigation.types';

export interface Navigation {
  compact: NavigationItem[];
  default: NavigationItem[];
  futuristic: NavigationItem[];
  horizontal: NavigationItem[];
}
