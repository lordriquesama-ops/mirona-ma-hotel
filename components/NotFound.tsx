import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon } from './Icons';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
            <div className="text-center max-w-2xl">
                {/* 404 Number */}
                <div className="mb-8">
                    <h1 className="text-9xl md:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400 leading-none">
                        404
                    </h1>
                </div>

                {/* Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-yellow-600/20 flex items-center justify-center">
                        <AlertTriangleIcon className="w-12 h-12 text-yellow-600" />
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-lg text-gray-400 mb-8 max-w-md mx-auto">
                    Sorry, the page you're looking for doesn't exist or has been moved.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-yellow-600 text-white font-semibold rounded-sm hover:bg-yellow-700 transition-colors shadow-lg"
                    >
                        Go to Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/website')}
                        className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-sm hover:bg-gray-100 transition-colors shadow-lg"
                    >
                        Visit Hotel Website
                    </button>
                </div>

                {/* Additional Info */}
                <div className="mt-12 pt-8 border-t border-gray-700">
                    <p className="text-sm text-gray-500">
                        If you believe this is an error, please contact support.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
