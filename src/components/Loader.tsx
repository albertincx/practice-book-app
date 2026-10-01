import React from 'react';

interface LoaderSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

export const LoaderSpinner: React.FC<LoaderSpinnerProps> = ({
                                                                size = 'md',
                                                                label = '...'
                                                            }) => {
    // Sadarkaa hammamiitiin akka fakkatu murteessuuf
    const sizeClasses = {
        sm: 'w-5 h-5 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
    };
    // console.log('a')
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
                role="status"
                aria-label="loading"
            />
            {label && (
                <span className="text-sm font-medium text-gray-300 animate-pulse">
          {label}
        </span>
            )}
        </div>
    );
};
