export function getTokenImageUrl(imageUrl: string | null | undefined): string {
  // Default placeholder if no image
  if (!imageUrl || imageUrl === '') {
    return '/placeholder-token.svg';
  }
  
  // If it's already a base64 data URL, return as is
  if (imageUrl.startsWith('data:image')) {
    return imageUrl;
  }
  
  // If it's a regular URL, return as is  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a relative path, return as is
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Default fallback
  return '/placeholder-token.svg';
}