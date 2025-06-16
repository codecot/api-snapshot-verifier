import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { palette as colors, semanticColors } from './tokens/colors';
import { spacing } from './tokens/spacing';
import { shadows } from './tokens/shadows';
import { borderRadius as borders } from './tokens/borders';

const meta = {
  title: 'Design System/Overview',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TokenShowcase: Story = {
  render: () => (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Color Showcase */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gray Scale */}
          <Card>
            <CardHeader>
              <CardTitle>Gray Scale</CardTitle>
              <CardDescription>Neutral colors for UI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(colors.gray).map(([shade, value]) => (
                <div key={shade} className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded border"
                    style={{ backgroundColor: value }}
                  />
                  <div>
                    <p className="font-mono text-sm">{shade}</p>
                    <p className="text-xs text-muted-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Primary Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
              <CardDescription>Brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(colors.primary).map(([shade, value]) => (
                <div key={shade} className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded border"
                    style={{ backgroundColor: value }}
                  />
                  <div>
                    <p className="font-mono text-sm">{shade}</p>
                    <p className="text-xs text-muted-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
              <CardDescription>Semantic status indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Success</h4>
                {Object.entries(colors.success).map(([shade, value]) => (
                  <div key={shade} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <p className="font-mono text-sm">{shade}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Warning</h4>
                {Object.entries(colors.warning).map(([shade, value]) => (
                  <div key={shade} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <p className="font-mono text-sm">{shade}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Error</h4>
                {Object.entries(colors.error).map(([shade, value]) => (
                  <div key={shade} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <p className="font-mono text-sm">{shade}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Spacing Showcase */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Spacing System</h2>
        <Card>
          <CardHeader>
            <CardTitle>Base Spacing Scale</CardTitle>
            <CardDescription>4px grid system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(spacing.base).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-16 font-mono text-sm">{key}</span>
                <span className="w-20 text-sm text-muted-foreground">{value}</span>
                <div 
                  className="bg-primary/20 rounded"
                  style={{ height: '24px', width: value }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Shadow Showcase */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Elevation & Shadows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card style={{ boxShadow: shadows.elevation.sm }}>
            <CardHeader>
              <CardTitle>Small Elevation</CardTitle>
              <CardDescription>Subtle depth</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs">{shadows.elevation.sm}</code>
            </CardContent>
          </Card>
          <Card style={{ boxShadow: shadows.elevation.md }}>
            <CardHeader>
              <CardTitle>Medium Elevation</CardTitle>
              <CardDescription>Standard depth</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs">{shadows.elevation.md}</code>
            </CardContent>
          </Card>
          <Card style={{ boxShadow: shadows.elevation.lg }}>
            <CardHeader>
              <CardTitle>Large Elevation</CardTitle>
              <CardDescription>High depth</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs">{shadows.elevation.lg}</code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Border Radius Showcase */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Border System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <div 
                className="w-20 h-20 bg-primary/20 border-2 border-primary/40"
                style={{ borderRadius: borders.none }}
              />
              <CardTitle className="text-sm mt-2">None</CardTitle>
              <CardDescription>{borders.none}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div 
                className="w-20 h-20 bg-primary/20 border-2 border-primary/40"
                style={{ borderRadius: borders.sm }}
              />
              <CardTitle className="text-sm mt-2">Small</CardTitle>
              <CardDescription>{borders.sm}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div 
                className="w-20 h-20 bg-primary/20 border-2 border-primary/40"
                style={{ borderRadius: borders.md }}
              />
              <CardTitle className="text-sm mt-2">Medium</CardTitle>
              <CardDescription>{borders.md}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div 
                className="w-20 h-20 bg-primary/20 border-2 border-primary/40"
                style={{ borderRadius: borders.lg }}
              />
              <CardTitle className="text-sm mt-2">Large</CardTitle>
              <CardDescription>{borders.lg}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Component Examples */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Component Examples</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-green-100 text-green-800">Success</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  ),
};