import React from 'react';

export const normalizeDisplayName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()

interface SmartTextProps {
  /** The text or potential URL to render */
  text: string;
  /** Optional custom styling classes */
  className?: string;
}

interface SmartTextProps {
  /** The text or potential URL to render */
  text: string;
  /** Optional custom styling classes */
  className?: string;
}

export const SmartText: React.FC<SmartTextProps> = ({ text, className }) => {
  const maxLength = 100;
  // Helper function to validate if the text is a properly formatted URL
  const isValidUrl = (input: string): boolean => {
    try {
      // The URL constructor throws an error if the input string is invalid
      const url = new URL(input);
      // Ensure it uses web protocols (http or https) to block malicious scripts (e.g., javascript:)
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (isValidUrl(text)) {
    return (
      <a 
        href={text} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={className ? className : "custom-hyperlink"}
      >
        {text.length > maxLength ? text.slice(0, maxLength) + "..." : text}
      </a>
    );
  }

  // Fallback to plain text if it is not a valid URL
  return <span className={className}>{text}</span>;
};