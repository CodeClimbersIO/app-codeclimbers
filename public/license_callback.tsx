// *Actual file hosted on Framer site*

import type { ComponentType } from 'react'
import * as React from 'react'

interface ButtonStyle extends React.CSSProperties {
  backgroundColor: string
  border: string
}

type ComponentWithProps = React.ComponentType<{
  children?: React.ReactNode
  style?: React.CSSProperties
}>

export function withLicenseCallback(Component: ComponentWithProps): ComponentType {
    return (props) => {
        const [isSuccess, setIsSuccess] = React.useState<boolean | null>(null)
        const [deepLinkUrl, setDeepLinkUrl] = React.useState<string>('')
        const [message, setMessage] = React.useState<string>('Processing...')

        React.useEffect(() => {
            const searchParams = new URLSearchParams(window.location.search)
            const sessionId = searchParams.get('session_id')

            if (sessionId) {
                setIsSuccess(true)
                setDeepLinkUrl(`ebb://license/success?session_id=${sessionId}`)
                setMessage('Payment successful! Click "Open App" to activate your license.')
            } else {
                setIsSuccess(false)
                setDeepLinkUrl('ebb://license/cancel')
                setMessage('Payment cancelled. You can close this window or return to the app.')
            }
        }, [])

        const openApp = React.useCallback(() => {
            if (deepLinkUrl) {
                window.location.href = deepLinkUrl
            }
        }, [deepLinkUrl])

        React.useEffect(() => {
            if (deepLinkUrl) {
                openApp()
            }
        }, [deepLinkUrl, openApp])

        const BaseComponent = Component || 'div' 

        return (
            <BaseComponent
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
                        {isSuccess === null ? 'Processing...' : isSuccess ? 'Payment Successful' : 'Payment Cancelled'}
                    </h1>
                    <p style={{ 
                        fontSize: '16px',
                        margin: 0,
                        opacity: 0.8 
                    }}>
                        {message}
                    </p>
                    {deepLinkUrl && ( // Only show button once link is ready
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
                            } satisfies ButtonStyle}
                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                const target = e.currentTarget
                                target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                                target.style.border = '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                const target = e.currentTarget
                                target.style.backgroundColor = 'transparent'
                                target.style.border = '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            Open App
                        </button>
                    )}
                    <p style={{ 
                        fontSize: '14px',
                        margin: '16px 0 0 0',
                        opacity: 0.5 
                    }}>
                        You can close this window.
                    </p>
                </div>
            </BaseComponent>
        )
    }
}
