import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { Spinner } from "@/components/ui/spinner";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { useSetBreadcrumbs } from "@/contexts/BreadcrumbContext";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Check,
  FileText,
  Home,
  Mail,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  User,
  Zap,
} from "lucide-react";

export default function StyleGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: "1", label: "Account Info", description: "Basic details" },
    { id: "2", label: "Preferences", description: "Your settings" },
    { id: "3", label: "Review", description: "Confirm details" },
    { id: "4", label: "Complete", description: "All done!" },
  ];

  useSetBreadcrumbs([
    { label: "Documentation", href: "/docs" },
    { label: "Components", href: "/docs/components" },
    { label: "Style Guide" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content - Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="container-comfortable py-12">
        <header className="mb-12">
          <h1 className="text-display mb-4">UX Design System</h1>
          <p className="text-body-large text-muted-foreground max-w-3xl">
            A comprehensive design system featuring premium micro-interactions, accessibility
            features, and performance optimizations for exceptional user experiences.
          </p>
        </header>

        <main id="main-content" className="space-y-12">
          {/* Typography Section */}
          <section>
            <h2 className="text-heading-1 mb-6">Typography Scale</h2>
            <Card className="p-6 space-y-4">
              <div>
                <h1>Display Heading (46px)</h1>
                <p className="text-caption">1.25 ratio scale with -0.02em letter spacing</p>
              </div>
              <div>
                <h2>Heading 1 (37px)</h2>
                <p className="text-caption">Bold weight, tight line height 1.2</p>
              </div>
              <div>
                <h3>Heading 2 (30px)</h3>
                <p className="text-caption">Semibold weight for secondary headings</p>
              </div>
              <div>
                <h4>Heading 3 (24px)</h4>
                <p className="text-caption">UI element headings</p>
              </div>
              <div>
                <p className="text-body-large">Body Large (18px) - Primary content text</p>
                <p className="text-caption">Line height 1.5 for readability</p>
              </div>
              <div>
                <p className="text-body">Body Text (15px) - Secondary content</p>
                <p className="text-caption">Optimal for dense information</p>
              </div>
              <div>
                <p className="text-caption">Caption (12px) - Labels and metadata</p>
              </div>
            </Card>
          </section>

          {/* Color System */}
          <section>
            <h2 className="text-heading-1 mb-6">Color Palette (WCAG AA Compliant)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-heading-3 mb-4">Primary Blues</h3>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className={`h-10 rounded flex items-center px-3 bg-primary-${shade} ${
                        shade >= 500 ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      Primary {shade}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-heading-3 mb-4">Semantic Colors</h3>
                <div className="space-y-3">
                  <div className="status-success">Success State</div>
                  <div className="status-warning">Warning State</div>
                  <div className="status-error">Error State</div>
                  <div className="status-info">Info State</div>
                  <div className="status-neutral">Neutral State</div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-heading-3 mb-4">Neutral Grays</h3>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className={`h-10 rounded flex items-center px-3 bg-neutral-${shade} ${
                        shade >= 500 ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      Neutral {shade}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* Button Variants */}
          <section>
            <h2 className="text-heading-1 mb-6">Interactive Buttons (44px Touch Targets)</h2>
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-heading-3 mb-4">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>

              <div>
                <h3 className="text-heading-3 mb-4">Sizes (All 44px+ Touch Targets)</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-heading-3 mb-4">States</h3>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button onClick={() => setLoading(true)}>
                    {loading ? <Spinner size="sm" label="Processing" /> : "Click to Load"}
                  </Button>
                  <Button className="hover-glow">Hover Glow</Button>
                </div>
              </div>
            </Card>
          </section>

          {/* Form Elements */}
          <section>
            <h2 className="text-heading-1 mb-6">Form Components (Enhanced Accessibility)</h2>
            <Card className="p-6 space-y-6">
              <div className="form-field-wrapper">
                <label htmlFor="email-input" className="form-label">
                  Email Address
                </label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="you@example.com"
                  aria-describedby="email-help"
                />
                <p id="email-help" className="form-description">
                  We'll never share your email with anyone else.
                </p>
              </div>

              <div className="form-field-wrapper">
                <label htmlFor="search-input" className="form-label">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-[0.625rem] h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-input"
                    placeholder="Search..."
                    className="pl-9"
                    aria-label="Search input"
                  />
                </div>
              </div>

              <div className="form-field-wrapper">
                <label htmlFor="message-textarea" className="form-label">
                  Message
                </label>
                <Textarea
                  id="message-textarea"
                  placeholder="Type your message here..."
                  aria-describedby="message-counter"
                />
                <p id="message-counter" className="form-description">
                  Maximum 500 characters
                </p>
              </div>

              <div className="space-y-3">
                <div className="form-error">
                  <AlertCircle className="h-3 w-3" />
                  This field is required
                </div>
                <div className="form-success">
                  <Check className="h-3 w-3" />
                  Validation successful
                </div>
              </div>
            </Card>
          </section>

          {/* Loading States */}
          <section>
            <h2 className="text-heading-1 mb-6">Loading States & Skeletons</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-heading-3">Text Skeleton</h3>
                <LoadingSkeleton variant="text" rows={3} />
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-heading-3">Card Skeleton</h3>
                <LoadingSkeleton variant="card" />
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-heading-3">Table Skeleton</h3>
                <LoadingSkeleton variant="table" rows={4} />
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-heading-3">Spinners</h3>
                <div className="flex items-center gap-6">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
              </Card>
            </div>
          </section>

          {/* Empty States */}
          <section>
            <h2 className="text-heading-1 mb-6">Empty States (User Guidance)</h2>
            <Card className="p-6">
              <EmptyState
                icon={FileText}
                title="No documents found"
                description="Get started by uploading your first document or importing from cloud storage."
                action={{
                  label: "Upload Document",
                  onClick: () => alert("Upload triggered"),
                }}
              />
            </Card>
          </section>

          {/* Error States */}
          <section>
            <h2 className="text-heading-1 mb-6">Error Handling (Clear Recovery Paths)</h2>
            <div className="space-y-4">
              <ErrorMessage
                title="Failed to load data"
                message="We couldn't fetch the latest information. Please check your connection and try again."
                onRetry={() => alert("Retrying...")}
              />
              <ErrorMessage
                title="Permission denied"
                message="You don't have access to view this resource. Contact your administrator if you believe this is an error."
              />
            </div>
          </section>

          {/* Progress Indicators */}
          <section>
            <h2 className="text-heading-1 mb-6">Progress Indicators (Multi-Step Flows)</h2>
            <Card className="p-8">
              <ProgressSteps steps={steps} currentStep={currentStep} className="mb-8" />
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  disabled={currentStep === steps.length - 1}
                >
                  Next Step
                </Button>
              </div>
            </Card>
          </section>

          {/* Micro-interactions */}
          <section>
            <h2 className="text-heading-1 mb-6">Micro-interactions (Delightful Feedback)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="card-interactive">
                <Zap className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-heading-3 mb-2">Hover Lift</h3>
                <p className="text-body text-muted-foreground">
                  Gentle elevation on hover creates depth perception
                </p>
              </Card>

              <Card className="card-elevated">
                <Mail className="w-8 h-8 text-secondary mb-3" />
                <h3 className="text-heading-3 mb-2">Shadow Elevation</h3>
                <p className="text-body text-muted-foreground">
                  Consistent shadow system for visual hierarchy
                </p>
              </Card>

              <Card className="card-ghost">
                <User className="w-8 h-8 text-accent mb-3" />
                <h3 className="text-heading-3 mb-2">Ghost Hover</h3>
                <p className="text-body text-muted-foreground">
                  Subtle background change for interactive elements
                </p>
              </Card>
            </div>
          </section>

          {/* Animations */}
          <section>
            <h2 className="text-heading-1 mb-6">Smooth Animations (0.2s Transitions)</h2>
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-muted rounded-lg slide-in-left">
                  <h4 className="font-semibold mb-2">Slide In Left</h4>
                  <p className="text-sm text-muted-foreground">Entrance animation</p>
                </div>
                <div className="p-6 bg-muted rounded-lg slide-in-right">
                  <h4 className="font-semibold mb-2">Slide In Right</h4>
                  <p className="text-sm text-muted-foreground">Drawer transitions</p>
                </div>
                <div className="p-6 bg-muted rounded-lg slide-in-up">
                  <h4 className="font-semibold mb-2">Slide In Up</h4>
                  <p className="text-sm text-muted-foreground">Modal appearances</p>
                </div>
                <div className="p-6 bg-muted rounded-lg fade-in">
                  <h4 className="font-semibold mb-2">Fade In</h4>
                  <p className="text-sm text-muted-foreground">Content reveals</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Confirmation Dialogs */}
          <section>
            <h2 className="text-heading-1 mb-6">Confirmation Dialogs (Prevent Mistakes)</h2>
            <Card className="p-6">
              <div className="flex gap-3">
                <Button onClick={() => setShowConfirmation(true)} variant="destructive">
                  Delete Item
                </Button>
                <Button variant="outline">Safe Action</Button>
              </div>
              <ConfirmationDialog
                open={showConfirmation}
                onOpenChange={setShowConfirmation}
                title="Are you sure?"
                description="This action cannot be undone. This will permanently delete the item from our servers."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={() => {
                  alert("Item deleted");
                  setShowConfirmation(false);
                }}
                variant="destructive"
              />
            </Card>
          </section>

          {/* Accessibility Features */}
          <section>
            <h2 className="text-heading-1 mb-6">Accessibility Features (WCAG AA)</h2>
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-heading-3 mb-3">Touch Targets</h3>
                <p className="text-body mb-4">All interactive elements meet 44px minimum size for mobile usability</p>
                <Button size="icon" className="touch-target">
                  <Home className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="text-heading-3 mb-3">Keyboard Navigation</h3>
                <p className="text-body mb-4">Press Tab to navigate through focusable elements with visible rings</p>
                <div className="flex gap-3">
                  <Button className="focus-ring">Tab to me</Button>
                  <Button className="focus-ring">Then here</Button>
                  <Button className="focus-ring">Finally here</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-heading-3 mb-3">Screen Reader Support</h3>
                <p className="text-body mb-4">ARIA labels, live regions, and semantic HTML throughout</p>
                <Button aria-label="Delete user account" variant="destructive">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Delete (visible to screen readers only)</span>
                </Button>
              </div>
            </Card>
          </section>

          {/* Responsive Design */}
          <section>
            <h2 className="text-heading-1 mb-6">Responsive Layouts</h2>
            <Card className="p-6">
              <p className="text-body mb-6">
                All components adapt gracefully across screen sizes with mobile-first approach
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-6 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Responsive Card {i}</h4>
                    <p className="text-sm text-muted-foreground">
                      1 column mobile, 2 tablet, 3 desktop
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              Design System v1.0 • Built with accessibility, performance, and user delight in mind
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
