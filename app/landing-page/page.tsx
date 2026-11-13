export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      <div className="relative flex items-center justify-between px-4 py-4 sm:px-8 md:px-12 md:py-5 lg:px-5">
        <div data-skills-click="logo">
          <a
            className="relative flex w-fit shrink-0 rounded-sm no-underline outline-none before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-[#0082fb] dark:focus-visible:ring-[#41a4ff]"
            href="/"
          >
            <img
              alt="aiforui.dev"
              width="35"
              height="32"
              decoding="async"
              data-nimg="1"
              className="h-[32px] w-auto object-contain color:transparent
      "
              srcSet="/_next/image?url=%2Faiforui.png&amp;w=48&amp;q=75 1x, /_next/image?url=%2Faiforui.png&amp;w=96&amp;q=75 2x"
              src="/_next/image?url=%2Faiforui.png&amp;w=96&amp;q=75"
            />
          </a>
        </div>
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded="false"
            data-skills-click="mobile-menu"
            className="-mr-3 text-gray-1200 relative flex size-10 before:absolute before:-inset-0.5 before:content-[''] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-[#0082fb] dark:focus-visible:ring-[#41a4ff]"
          >
            <span
              aria-hidden="true"
              className="relative flex size-4 items-center justify-center text-inherit"
            >
              <span className="absolute h-[1.5px] w-4 rounded-full bg-current transition-[translate,rotate] motion-reduce:transition-none duration-150 ease-out -translate-y-[3px]"></span>
              <span className="absolute h-[1.5px] w-4 rounded-full bg-current transition-[translate,rotate] motion-reduce:transition-none duration-150 ease-out translate-y-[3px]"></span>
            </span>
          </button>
        </div>
        <ul className="hidden items-center gap-3 lg:flex">
          <li>
            <button
              type="button"
              data-skills-click="theme-toggle"
              className="w-[34px] justify-center text-gray-1100 hover:text-gray-1200 relative -my-px flex h-[34px] cursor-pointer items-center rounded-full bg-white/[0.68] shadow-sm backdrop-blur-[6px] transition-[color,box-shadow] before:absolute before:-inset-1.5 before:content-[''] hover:shadow-md dark:bg-gray-100/[0.68] outline-none focus-visible:ring-2 focus-visible:ring-[#0082fb] dark:focus-visible:ring-[#41a4ff]"
            >
              <span className="sr-only dark:hidden">Switch to dark theme</span>
              <span className="sr-only hidden dark:inline">
                Switch to light theme
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="size-4 dark:hidden"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M12.0931 2.53021C12.2873 2.86472 12.2712 3.28123 12.0517 3.59971C11.3858 4.56582 10.9961 5.73577 10.9961 6.99976C10.9961 10.3135 13.6824 12.9998 16.9961 12.9998C18.2602 12.9998 19.4302 12.61 20.3963 11.9441C20.7148 11.7246 21.1313 11.7084 21.4658 11.9026C21.8003 12.0968 21.9929 12.4664 21.9602 12.8519C21.5264 17.9745 17.2324 21.996 11.9981 21.996C6.47632 21.996 2 17.5197 2 11.9979C2 6.76372 6.0214 2.46985 11.1438 2.03581C11.5292 2.00315 11.8989 2.19569 12.0931 2.53021ZM9.42003 4.42417C6.268 5.49679 4 8.48285 4 11.9979C4 16.4151 7.58088 19.996 11.9981 19.996C15.5133 19.996 18.4994 17.7279 19.5719 14.5757C18.7632 14.8506 17.8967 14.9998 16.9961 14.9998C12.5778 14.9998 8.99609 11.418 8.99609 6.99976C8.99609 6.0993 9.14518 5.2328 9.42003 4.42417Z"
                  fill="currentColor"
                ></path>
                <path
                  d="M16.2374 5.01736L17.049 3.39419C17.2332 3.02567 17.7591 3.02567 17.9434 3.3942L18.755 5.01736C18.8034 5.11413 18.8818 5.19259 18.9786 5.24097L20.6017 6.05255C20.9703 6.23682 20.9703 6.76272 20.6017 6.94698L18.9786 7.75857C18.8818 7.80695 18.8034 7.88541 18.755 7.98217L17.9434 9.60534C17.7591 9.97386 17.2332 9.97386 17.049 9.60534L16.2374 7.98217C16.189 7.88541 16.1105 7.80695 16.0138 7.75856L14.3906 6.94698C14.0221 6.76272 14.0221 6.23682 14.3906 6.05255L16.0138 5.24097C16.1105 5.19259 16.189 5.11413 16.2374 5.01736Z"
                  fill="currentColor"
                ></path>
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="hidden size-4 dark:block"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M15.5355 8.46447C17.4882 10.4171 17.4882 13.5829 15.5355 15.5355C13.5829 17.4882 10.4171 17.4882 8.46447 15.5355C6.51184 13.5829 6.51184 10.4171 8.46447 8.46447C10.4171 6.51184 13.5829 6.51184 15.5355 8.46447Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
                <path
                  d="M12 3V2M12 22V21M18.3598 5.64005L19.0698 4.93005M4.93016 19.07L5.64016 18.36M21 12H22M2 12H3M18.3598 18.36L19.0698 19.07M4.93016 4.93005L5.64016 5.64005"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></path>
              </svg>
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-label="Search skills"
              aria-keyshortcuts="Meta+K"
              className="min-w-52 gap-2 pr-3 pl-3.5 text-gray-1100 hover:text-gray-1200 relative -my-px flex h-[34px] cursor-pointer items-center rounded-full bg-white/[0.68] shadow-sm backdrop-blur-[6px] transition-[color,box-shadow] before:absolute before:-inset-1.5 before:content-[''] hover:shadow-md dark:bg-gray-100/[0.68] outline-none focus-visible:ring-2 focus-visible:ring-[#0082fb] dark:focus-visible:ring-[#41a4ff]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="size-4 shrink-0"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m20 20-3.5-3.5"></path>
              </svg>
              <span className="text-foreground-400 text-sm">Search</span>
              <kbd className="text-foreground-400 ms-auto font-sans text-xs tracking-widest">
                ⌘K
              </kbd>
            </button>
          </li>
          <li>
            <a
              data-skills-click="header-cta"
              data-button="true"
              className="logged-out-only buy-button buy-button-small buy-button-sticky relative before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] rounded-full!"
              href="#enrollment-closed"
            >
              <span className="font-size:14px">Notify me</span>
            </a>
          </li>
        </ul>
      </div>
      <div className="flex flex-col mt-20">
        <h1 className="text-center my-auto font-[450] text-5xl tracking-tighter">
          <span className="rounded-full bg-gray-400 pb-1.5 border-shadow-border px-5 py-1">
            testimonials
          </span>
        </h1>
        <p className="text-center text-lg mt-4 tracking-[-0.22px] [word-spacing:0.09em]">
          See what students say about our classes
        </p>
      </div>
      <section>
        <div className="grid place-items-center mt-10">
          <div className="h-50 w-2xl shadow-border rounded-lg bg-preview-bg"></div>
        </div>
      </section>
    </main>
  );
}
