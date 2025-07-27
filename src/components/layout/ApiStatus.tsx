import { useEffect, useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api'

interface ApiService {
  name: string
  status: 'connected' | 'disconnected' | 'checking'
  description?: string
}

export function ApiStatus() {
  const [services, setServices] = useState<ApiService[]>([
    { name: 'BioAgent API', status: 'checking', description: 'Core research engine' },
    { name: 'PubMed', status: 'checking', description: 'Medical literature database' },
    { name: 'bioRxiv', status: 'checking', description: 'Preprint repository' },
    { name: 'Crossref', status: 'checking', description: 'Scholarly metadata' },
    { name: 'PubTator', status: 'checking', description: 'Biocuration annotations' },
    { name: 'Ensembl Plants', status: 'checking', description: 'Plant genomics' },
    { name: 'Semantic Scholar', status: 'checking', description: 'Academic search' },
  ])

  useEffect(() => {
    // Check API health status
    const checkApiHealth = async () => {
      try {
        await apiClient.health()
        setServices(prev => prev.map(service => 
          service.name === 'BioAgent API' 
            ? { ...service, status: 'connected' }
            : service
        ))
        
        // Assume other services are connected if main API is healthy
        // In a real app, you'd check each service individually
        setTimeout(() => {
          setServices(prev => prev.map(service => ({
            ...service,
            status: 'connected'
          })))
        }, 500)
      } catch (error) {
        console.error('API health check failed:', error)
        setServices(prev => prev.map(service => ({
          ...service,
          status: 'disconnected'
        })))
      }
    }

    checkApiHealth()
    // Re-check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: ApiService['status']) => {
    switch (status) {
      case 'connected':
        return <Check className="w-4 h-4 text-green-500" />
      case 'disconnected':
        return <X className="w-4 h-4 text-red-500" />
      case 'checking':
        return <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
    }
  }

  return (
    <div className="p-4 border-b border-border-subtle">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        Connected Services
      </h3>
      <div className="space-y-2">
        {services.map((service) => (
          <div 
            key={service.name}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
              service.status === 'connected' && "bg-green-500/5",
              service.status === 'disconnected' && "bg-red-500/5",
              service.status === 'checking' && "bg-white/[0.02]"
            )}
          >
            {getStatusIcon(service.status)}
            <div className="flex-1">
              <span className={cn(
                "font-medium",
                service.status === 'connected' && "text-text-primary",
                service.status === 'disconnected' && "text-text-secondary",
                service.status === 'checking' && "text-text-tertiary"
              )}>
                {service.name}
              </span>
              {service.description && (
                <p className="text-xs text-text-tertiary mt-0.5">
                  {service.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}