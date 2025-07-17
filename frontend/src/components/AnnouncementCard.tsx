import React from 'react';
import { Link } from 'react-router-dom';
import { Announcement } from '../services/announcementService';

interface AnnouncementCardProps {
  announcement: Announcement;
  isNew?: boolean;
  showEditButton?: boolean;
  onEditClick?: (id: string) => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ 
  announcement, 
  isNew = false,
  showEditButton = false,
  onEditClick
}) => {
  const formattedDate = new Date(announcement.createdAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <Link to={`/announcements/${announcement.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
            {announcement.title}
          </Link>
          
          <div className="flex items-center mt-1">
            <span className="text-gray-500 text-sm">{formattedDate}</span>
            {isNew && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                新着情報
              </span>
            )}
          </div>
        </div>
        
        {showEditButton && (
          <button
            onClick={() => onEditClick && onEditClick(announcement.id)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            aria-label="編集する"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCard; 