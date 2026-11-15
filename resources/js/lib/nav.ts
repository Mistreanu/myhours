import { type NavItem } from '@/types';
import { Briefcase, Building2, Coins, FileText, Tag, Timer } from 'lucide-react';

export const mainNavItems: NavItem[] = [
    { title: 'Track', url: '/track', icon: Timer },
    { title: 'Detailed report', url: '/reports/detailed', icon: FileText },
];

export const manageNavItems: NavItem[] = [
    { title: 'Projects', url: '/projects', icon: Briefcase },
    { title: 'Rates', url: '/rates', icon: Coins },
    { title: 'Clients', url: '/clients', icon: Building2 },
    { title: 'Tags', url: '/tags', icon: Tag },
];
