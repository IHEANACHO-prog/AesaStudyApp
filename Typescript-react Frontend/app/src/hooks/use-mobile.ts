import * as React from "react"

/**
 * AESAStudy Standard Mobile Breakpoint
 * Matches Tailwind's 'md' prefix (768px)
 */
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Define the media query
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler that uses the MediaQueryList event directly
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    // Initial check
    setIsMobile(mql.matches)

    // Listen for changes
    mql.addEventListener("change", onChange)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}