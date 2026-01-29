import React from "react";
import { Link } from "react-router-dom";
import { Announcement } from "../services/announcementService";

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
  onEditClick,
}) => {
  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(announcement.createdAt));

  return (
    <article className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-200 hover:shadow-md transition-shadow duration-150">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <Link
            to={`/announcements/${announcement.id}`}
            className="text-juice-orange-600 hover:text-juice-orange-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2 rounded"
          >
            <span className="line-clamp-2">{announcement.title}</span>
          </Link>

          <div className="flex items-center mt-1 gap-2">
            <time
              className="text-gray-500 text-sm tabular-nums"
              dateTime={announcement.createdAt}
            >
              {formattedDate}
            </time>
            {isNew && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                新着情報
              </span>
            )}
          </div>
        </div>

        {showEditButton && (
          <button
            onClick={() => onEditClick && onEditClick(announcement.id)}
            className="ml-2 p-2 text-gray-500 hover:text-juice-orange-600 transition-colors duration-150 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-juice-orange-500 focus-visible:ring-offset-2"
            aria-label={`${announcement.title}を編集する`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
};

export default AnnouncementCard;
