import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { OnboardingUtils } from '@/lib/utils/onboarding'
import { ShortcutInput } from '@/components/ShortcutInput'

export const ShortcutTutorialPage = () => {
  const navigate = useNavigate()

  const handleComplete = async () => {
    try {
      await OnboardingUtils.markOnboardingCompleted()
      navigate('/start-flow')
    } catch (error) {
      console.error(`Failed to complete shortcut tutorial step: ${error}`)
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-background p-4'>
      <h1 className='text-3xl font-bold mb-4'>Your New Focus Shortcut</h1>
      <p className='text-muted-foreground text-center mb-10 max-w-sm'>
        Use this shortcut from anywhere on your computer to instantly start a focus session
      </p>
      
      <div className='max-w-xs mx-auto w-full border-b mb-10' />
      
      <div className='flex flex-col items-center gap-4 mb-10'>
        <ShortcutInput />

        <p className='text-muted-foreground text-center text-xs'>
          Click to change
        </p>
      </div>

      <Button
        size='lg'
        onClick={handleComplete}
        className='min-w-[200px]'
      >
        Continue
      </Button>
    </div>
  )
}

