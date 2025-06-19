import { PageLayout } from '@/components/shared'
import { Card, CardContent } from '@/components/ui/card'
import { GitCompare } from 'lucide-react'

export default function Compare() {
  return (
    <PageLayout title="Compare" subtitle="Compare snapshots and view differences">
      <Card>
        <CardContent className="py-12 text-center">
          <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Comparison feature is coming soon</p>
          <p className="text-sm text-muted-foreground mt-2">
            This page will allow you to compare different API snapshots and visualize the differences.
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  )
}