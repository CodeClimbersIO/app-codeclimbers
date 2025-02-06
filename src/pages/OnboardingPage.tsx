import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Code2, Paintbrush, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'

type Role = 'developer' | 'designer' | 'creator'

interface RoleOption {
  id: Role
  title: string
  description: string
  icon: React.ReactNode
  statLabel: string
}

const roleOptions: RoleOption[] = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'I write code and build software',
    icon: <Code2 className="h-8 w-8" />,
    statLabel: 'Time Spent Coding'
  },
  {
    id: 'designer',
    title: 'Designer',
    description: 'I create visual designs and user experiences',
    icon: <Paintbrush className="h-8 w-8" />,
    statLabel: 'Time Spent Designing'
  },
  {
    id: 'creator',
    title: 'Creator',
    description: 'I create content and build in public',
    icon: <Wand2 className="h-8 w-8" />,
    statLabel: 'Time Spent Creating'
  }
]

export const OnboardingPage = () => {
  const navigate = useNavigate()
  const { setUserRole } = useSettings()

  const handleRoleSelect = (role: Role) => {
    setUserRole(role)
    navigate('/')
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-semibold mb-4">Welcome! Who are you?</h1>
          <p className="text-muted-foreground mb-8">
            Select your primary role to help us personalize your experience
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleOptions.map((option) => (
              <Card
                key={option.id}
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleRoleSelect(option.id)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  {option.icon}
                  <h3 className="font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
} 
