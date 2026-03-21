import { render, screen } from '@testing-library/react';
import FeatureCard from './FeatureCard';

describe('FeatureCard', () => {
  it('renders the title and description', () => {
    render(<FeatureCard title='Test Feature' description='Feature description' />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('Feature description')).toBeInTheDocument();
  });
});
