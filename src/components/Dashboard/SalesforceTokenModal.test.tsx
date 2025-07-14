import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SalesforceTokenModal } from './SalesforceTokenModal';

describe('SalesforceTokenModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConnect = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('should not render when isOpen is false', () => {
    render(
      <SalesforceTokenModal
        isOpen={false}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    expect(screen.queryByText('Connect with Access Token')).not.toBeInTheDocument();
  });
  
  it('should render when isOpen is true', () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    expect(screen.getByText('Connect with Access Token')).toBeInTheDocument();
    expect(screen.getByText('Direct token authentication for testing')).toBeInTheDocument();
  });
  
  it('should call onClose when close button is clicked', () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('should display error message when provided', () => {
    const errorMessage = 'Invalid token error';
    
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
        error={errorMessage}
      />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
  
  it('should disable submit button when required fields are empty', () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /connect with token/i });
    
    expect(submitButton).toBeDisabled();
  });
  
  it('should enable submit button when required fields are filled', async () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/instance url/i), {
      target: { value: 'https://test.my.salesforce.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/access token/i), {
      target: { value: 'test-token' }
    });
    
    // Check that submit button is enabled
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /connect with token/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
  
  it('should call onConnect with correct values when form is submitted', async () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/instance url/i), {
      target: { value: 'https://test.my.salesforce.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/access token/i), {
      target: { value: 'test-token' }
    });
    
    // Select organization type
    fireEvent.click(screen.getByLabelText(/sandbox/i));
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /connect with token/i }));
    
    // Check that onConnect was called with correct values
    expect(mockOnConnect).toHaveBeenCalledWith({
      accessToken: 'test-token',
      instanceUrl: 'https://test.my.salesforce.com',
      orgType: 'sandbox'
    });
  });
  
  it('should show loading state when isLoading is true', () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
        isLoading={true}
      />
    );
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    
    const submitButton = screen.getByRole('button', { name: /connecting/i });
    expect(submitButton).toBeDisabled();
  });
  
  it('should toggle token visibility when eye icon is clicked', async () => {
    render(
      <SalesforceTokenModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
      />
    );
    
    // Get the token input and eye button
    const tokenInput = screen.getByLabelText(/access token/i);
    const eyeButton = screen.getByRole('button', { name: '' }); // Eye button has no accessible name
    
    // Check initial state (token should be hidden)
    expect(tokenInput).toHaveStyle('filter: blur(4px)');
    
    // Click eye button to show token
    fireEvent.click(eyeButton);
    
    // Check that token is now visible
    await waitFor(() => {
      expect(tokenInput).not.toHaveStyle('filter: blur(4px)');
    });
    
    // Click eye button again to hide token
    fireEvent.click(eyeButton);
    
    // Check that token is hidden again
    await waitFor(() => {
      expect(tokenInput).toHaveStyle('filter: blur(4px)');
    });
  });
});