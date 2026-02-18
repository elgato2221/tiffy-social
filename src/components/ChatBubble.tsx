"use client";

interface ChatBubbleProps {
  content: string;
  isMine: boolean;
  time: string;
  cost?: number;
}

export default function ChatBubble({ content, isMine, time, cost = 0 }: ChatBubbleProps) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
          isMine
            ? "bg-pink-500 text-white rounded-br-md"
            : "bg-gray-200 text-gray-800 rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed break-words">{content}</p>
        <div
          className={`flex items-center gap-1.5 mt-1 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[10px] ${
              isMine ? "text-pink-100" : "text-gray-400"
            }`}
          >
            {time}
          </span>
          {cost > 0 && (
            <span
              className={`text-[10px] flex items-center gap-0.5 ${
                isMine ? "text-pink-100" : "text-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-2.5 w-2.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 13.807 10.304 14 10 14c-.304 0-.792-.193-1.264-.979a5.67 5.67 0 01-.421-.821H10a1 1 0 100-2H7.958a7.3 7.3 0 010-1H10a1 1 0 100-2H8.315c.163-.29.346-.559.421-.821z" />
              </svg>
              {cost}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
