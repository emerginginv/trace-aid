import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCenter } from "@/components/ui/notification-center";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { PrintLayout } from "@/components/ui/print-layout";
import {
  Sparkles,
  Palette,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Layout,
  Eye,
  Printer,
} from "lucide-react";

export default function PremiumShowcase() {
  const [activeTab, setActiveTab] = useState("visual");

  useSetBreadcrumbs([
    { label: "Documentation" },
    { label: "Premium Features" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Glass Navigation Header */}
      <header className="glass-nav p-4 mb-8">
        <div className="container-comfortable flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-heading-2">Premium Design System</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <KeyboardShortcuts />
          </div>
        </div>
      </header>

      <main className="container-comfortable py-12">
        <div className="mb-8">
          <div className="gradient-overlay-primary rounded-2xl p-12 text-center mb-12">
            <h2 className="text-display text-foreground mb-4">
              Enterprise-Grade Design Excellence
            </h2>
            <p className="text-body-large text-muted-foreground max-w-3xl mx-auto">
              Production-ready components with premium visual effects, accessibility features,
              and performance optimizations for world-class user experiences.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="visual">
              <Eye className="w-4 h-4 mr-2" />
              Visual Effects
            </TabsTrigger>
            <TabsTrigger value="brand">
              <Palette className="w-4 h-4 mr-2" />
              Brand
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="w-4 h-4 mr-2" />
              Data
            </TabsTrigger>
            <TabsTrigger value="enterprise">
              <Shield className="w-4 h-4 mr-2" />
              Enterprise
            </TabsTrigger>
            <TabsTrigger value="cutting-edge">
              <Zap className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Visual Effects Tab */}
          <TabsContent value="visual" className="space-y-8">
            <section>
              <h3 className="text-heading-1 mb-6">Advanced Visual Effects</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Glassmorphism */}
                <div className="glass-card">
                  <div className="mb-4">
                    <Badge variant="secondary">Glassmorphism</Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Glass Effect</h4>
                  <p className="text-body text-muted-foreground">
                    Sophisticated frosted glass with backdrop blur for modern, layered interfaces.
                  </p>
                </div>

                {/* Premium Shadows */}
                <Card className="shadow-premium p-6">
                  <div className="mb-4">
                    <Badge variant="secondary">Premium Shadows</Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Multi-Layer Depth</h4>
                  <p className="text-body text-muted-foreground">
                    Sophisticated shadow system with multiple elevation levels for visual hierarchy.
                  </p>
                </Card>

                {/* Gradient Overlays */}
                <Card className="gradient-overlay-primary p-6">
                  <div className="mb-4">
                    <Badge variant="secondary">Gradient Overlays</Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Subtle Gradients</h4>
                  <p className="text-body text-muted-foreground">
                    10-15% opacity brand color gradients for visual interest.
                  </p>
                </Card>

                {/* Colored Shadows */}
                <Card className="p-6 shadow-primary-glow">
                  <div className="mb-4">
                    <Badge className="bg-primary">Primary Glow</Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Brand Shadows</h4>
                  <p className="text-body text-muted-foreground">
                    Colored shadows matching brand colors for emphasis.
                  </p>
                </Card>

                {/* Success Glow */}
                <Card className="p-6 shadow-success-glow">
                  <div className="mb-4">
                    <Badge variant="secondary" className="bg-success text-success-foreground">
                      Success Glow
                    </Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Success States</h4>
                  <p className="text-body text-muted-foreground">
                    Celebratory visual effects for positive actions.
                  </p>
                </Card>

                {/* Premium Card */}
                <div className="card-premium p-6">
                  <div className="mb-4">
                    <Badge variant="outline">Gradient Border</Badge>
                  </div>
                  <h4 className="text-heading-3 mb-2">Premium Card</h4>
                  <p className="text-body text-muted-foreground">
                    Elegant gradient border for premium features.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-heading-1 mb-6">Premium Dividers</h3>
              <Card className="p-8 space-y-8">
                <div>
                  <h4 className="text-heading-3 mb-4">Standard Separator</h4>
                  <Separator />
                </div>

                <div>
                  <h4 className="text-heading-3 mb-4">Gradient Divider</h4>
                  <div className="divider-gradient" />
                </div>

                <div>
                  <h4 className="text-heading-3 mb-4">Glow Divider</h4>
                  <div className="divider-glow" />
                </div>
              </Card>
            </section>
          </TabsContent>

          {/* Brand Personality Tab */}
          <TabsContent value="brand" className="space-y-8">
            <section>
              <h3 className="text-heading-1 mb-6">Brand Personality</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary glow-pulse" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Custom Animations</h4>
                      <p className="text-sm text-muted-foreground">
                        Brand-specific loading states
                      </p>
                    </div>
                  </div>
                  <div className="shimmer h-2 rounded-full" />
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center success-bounce">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Success Celebrations</h4>
                      <p className="text-sm text-muted-foreground">
                        Delightful confirmation moments
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">
                    🎉 Action completed successfully! Your changes have been saved.
                  </p>
                </Card>
              </div>
            </section>

            <section>
              <h3 className="text-heading-1 mb-6">Color Psychology</h3>
              <Card className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-primary mx-auto shadow-primary-glow" />
                    <div className="text-sm font-medium">Trust</div>
                    <div className="text-xs text-muted-foreground">Primary Actions</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-success mx-auto shadow-success-glow" />
                    <div className="text-sm font-medium">Success</div>
                    <div className="text-xs text-muted-foreground">Confirmations</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-warning mx-auto shadow-warning-glow" />
                    <div className="text-sm font-medium">Caution</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-destructive mx-auto shadow-destructive-glow" />
                    <div className="text-sm font-medium">Danger</div>
                    <div className="text-xs text-muted-foreground">Critical Actions</div>
                  </div>
                </div>
              </Card>
            </section>
          </TabsContent>

          {/* Data Visualization Tab */}
          <TabsContent value="data" className="space-y-8">
            <section>
              <h3 className="text-heading-1 mb-6">Data Formatting Excellence</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h4 className="text-heading-3 mb-4">Currency</h4>
                  <div className="space-y-2">
                    <div className="currency text-3xl font-bold text-success">
                      $1,234,567.89
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tabular nums for perfect alignment
                    </p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-heading-3 mb-4">Percentages</h4>
                  <div className="space-y-2">
                    <div className="percentage text-3xl font-bold text-primary">
                      87.5%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clean percentage display
                    </p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-heading-3 mb-4">Monospace Data</h4>
                  <div className="space-y-2">
                    <div className="monospace text-lg">
                      ID: 2024-00142
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Technical identifiers
                    </p>
                  </div>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* Enterprise Tab */}
          <TabsContent value="enterprise" className="space-y-8">
            <section>
              <h3 className="text-heading-1 mb-6">Enterprise-Grade Features</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Printer className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">Print Stylesheets</h4>
                      <p className="text-sm text-muted-foreground">
                        Professional document output
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => window.print()} variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Preview
                  </Button>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Layout className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">Advanced Layouts</h4>
                      <p className="text-sm text-muted-foreground">
                        Responsive grid systems
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* Cutting-Edge Tab */}
          <TabsContent value="cutting-edge" className="space-y-8">
            <section>
              <h3 className="text-heading-1 mb-6">Cutting-Edge Features</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="text-heading-3 mb-4">Smart Notifications</h4>
                  <p className="text-body text-muted-foreground mb-4">
                    Priority-based notification system with intelligent filtering
                  </p>
                  <NotificationCenter />
                </Card>

                <Card className="p-6">
                  <h4 className="text-heading-3 mb-4">Keyboard Shortcuts</h4>
                  <p className="text-body text-muted-foreground mb-4">
                    Press <Badge variant="outline" className="font-mono mx-1">?</Badge> 
                    to view all shortcuts
                  </p>
                  <KeyboardShortcuts />
                </Card>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        {/* Documentation Section */}
        <section className="mt-16 print-hidden">
          <Separator className="mb-8" />
          <div className="text-center space-y-4">
            <h3 className="text-heading-1">Ready for Production</h3>
            <p className="text-body-large text-muted-foreground max-w-2xl mx-auto">
              Pixel-perfect, accessible, and performance-optimized components
              ready for enterprise deployment.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Get Started
              </Button>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Print-only section */}
      <PrintLayout title="Premium Design System Documentation" className="hidden print:block">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-4">Visual Effects</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Glassmorphism with backdrop blur effects</li>
              <li>Multi-layer shadow system (8 elevation levels)</li>
              <li>Brand-colored shadows for emphasis</li>
              <li>Gradient overlays and borders</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold mb-4">Enterprise Features</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Professional print stylesheets</li>
              <li>Advanced data table with sorting and filtering</li>
              <li>Keyboard shortcuts overlay</li>
              <li>Priority-based notification system</li>
            </ul>
          </section>
        </div>
      </PrintLayout>
    </div>
  );
}
