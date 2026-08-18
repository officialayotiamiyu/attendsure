export function getFriendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) {
    const message = error.message.toLowerCase();

    if (message.includes('permission')) return 'You do not have permission to perform this action.';
    if (message.includes('network') || message.includes('failed to fetch')) {
      return 'Unable to reach the server. Please check your internet connection.';
    }
    if (message.includes('already belongs to an active organization')) {
      return 'This account is already linked to an active organization.';
    }
    if (message.includes('invalid or has already been used') || message.includes('invitation is invalid')) {
      return 'This invitation is invalid or has already been used.';
    }
    if (message.includes('expired')) return 'This invitation has expired.';
    if (message.includes('missing required')) return 'Please complete all required fields.';
    if (message.includes('late') && message.includes('reason')) {
      return 'A lateness reason is required for late clock-ins.';
    }
    return error.message;
  }
  return fallback;
}
