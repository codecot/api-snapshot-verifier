import { PageLayout } from '@/components/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Puzzle } from 'lucide-react'

export default function Plugins() {
  return (
    <PageLayout title="Plugins" subtitle="Manage and configure plugins">
      <Card>
        <CardContent className="py-12 text-center">
          <Puzzle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Plugin system is coming soon</p>
          <p className="text-sm text-muted-foreground mt-2">
            This page will allow you to install, configure, and manage plugins to extend the functionality.
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  )
}