// *This is a reference file. The actual file is hosted on Framer website

import type { ComponentType } from 'react'
import * as React from 'react'
import { createStore } from 'https://framer.com/m/framer/store.js@^1.0.0'

const useStore = createStore({
    isRedirecting: false,
})

export function withAuthSuccess(Component): ComponentType {
    return (props) => {
        const [store, setStore] = useStore()

        const openApp = React.useCallback(() => {
            const fullHash = window.location.hash
            const deepLinkUrl = `ebb://auth/callback${fullHash}`
            setStore({ isRedirecting: true })
            window.location.href = deepLinkUrl
        }, [])

        React.useEffect(() => {
            // Try to open automatically on page load
            openApp()

            const timer = setTimeout(() => {
                window.close()
            }, 60000)

            return () => clearTimeout(timer)
        }, [openApp])

        return (
            <Component
                {...props}
                style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#030712'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        color: '#fff',
                        textAlign: 'center',
                        padding: '24px'
                    }}
                >
                    <h1 style={{ 
                        fontSize: '24px', 
                        margin: 0,
                        fontWeight: 600 
                    }}>
                        Return to App
                    </h1>
                    <p style={{ 
                        fontSize: '16px',
                        margin: 0,
                        opacity: 0.8 
                    }}>
                        Click "Open App" to finish logging in
                    </p>
                    <button
                        onClick={openApp}
                        style={{
                            backgroundColor: 'transparent',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            marginTop: '8px',
                            transition: 'all 0.2s ease',
                        } as any}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.3)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        Open App
                    </button>
                    <p style={{ 
                        fontSize: '14px',
                        margin: '16px 0 0 0',
                        opacity: 0.5 
                    }}>
                        This window will automatically close after 1 minute
                    </p>
                </div>
            </Component>
        )
    }
}
