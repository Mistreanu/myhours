import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <AppLogoIcon className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate text-base leading-none font-bold tracking-tight">
                    my<span className="text-sidebar-primary">hours</span>
                </span>
            </div>
        </>
    );
}
