export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  isImplemented: boolean;
  badge?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}
