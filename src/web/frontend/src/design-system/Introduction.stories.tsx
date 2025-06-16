import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Design System/Introduction',
  parameters: {
    layout: 'padded',
    docs: {
      page: () => (
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1>API Snapshot Design System</h1>
          
          <p className="lead">
            Welcome to the API Snapshot Design System documentation. This is your central hub for all UI components, 
            design tokens, and patterns used throughout the application.
          </p>

          <h2>Overview</h2>
          
          <p>Our design system is built on modern web standards and best practices:</p>
          
          <ul>
            <li><strong>Component Library</strong>: Reusable React components with TypeScript</li>
            <li><strong>Design Tokens</strong>: Consistent colors, typography, spacing, and shadows</li>
            <li><strong>Theme Support</strong>: Light and dark modes with seamless switching</li>
            <li><strong>Accessibility</strong>: WCAG 2.1 compliant components</li>
            <li><strong>Performance</strong>: Optimized for speed and efficiency</li>
          </ul>

          <h2>Getting Started</h2>

          <h3>For Developers</h3>
          <ol>
            <li><strong>Browse Components</strong>: Use the sidebar to explore available components</li>
            <li><strong>Interactive Playground</strong>: Modify props in real-time using the controls panel</li>
            <li><strong>Code Examples</strong>: Copy code snippets directly from the docs</li>
            <li><strong>Design Tokens</strong>: Reference our token documentation for consistent styling</li>
          </ol>

          <h3>For Designers</h3>
          <ol>
            <li><strong>Visual Reference</strong>: See all components in their various states</li>
            <li><strong>Design Tokens</strong>: Understand our color palette, spacing system, and typography</li>
            <li><strong>Patterns</strong>: Learn about common UI patterns and best practices</li>
            <li><strong>Accessibility</strong>: Review accessibility guidelines for each component</li>
          </ol>

          <h2>Core Principles</h2>

          <h3>1. Consistency</h3>
          <p>Every component follows the same patterns and conventions, making the UI predictable and easy to use.</p>

          <h3>2. Accessibility</h3>
          <p>All components are keyboard navigable and screen reader friendly, ensuring our app is usable by everyone.</p>

          <h3>3. Performance</h3>
          <p>Components are optimized for performance with lazy loading, memoization, and efficient rendering.</p>

          <h3>4. Flexibility</h3>
          <p>Our token-based system allows for easy theming and customization without breaking changes.</p>

          <h2>Architecture</h2>

          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
{`design-system/
├── tokens/          # Design tokens (colors, spacing, etc.)
├── components/      # Reusable UI components
├── patterns/        # Common UI patterns
└── utils/          # Helper functions and utilities`}
          </pre>

          <h2>Contributing</h2>

          <p>When adding new components or modifying existing ones:</p>

          <ol>
            <li>Follow the established patterns</li>
            <li>Add comprehensive Storybook documentation</li>
            <li>Include accessibility considerations</li>
            <li>Test in both light and dark themes</li>
            <li>Add unit tests for functionality</li>
          </ol>

          <h2>Resources</h2>

          <ul>
            <li><a href="#" className="text-primary hover:underline">Component Guidelines</a></li>
            <li><a href="#" className="text-primary hover:underline">Design Tokens</a></li>
            <li><a href="#" className="text-primary hover:underline">Accessibility Checklist</a></li>
            <li><a href="#" className="text-primary hover:underline">Best Practices</a></li>
          </ul>
        </div>
      ),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};