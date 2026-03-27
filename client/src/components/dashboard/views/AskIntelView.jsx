import React from 'react';
import ChatbotWidget from '../ChatbotWidget';

export default function AskIntelView() {
  return (
    <div className="ask-intel-view ask-intel-view--centered">
      <div className="ask-intel-workspace ask-intel-workspace--centered">
        <div className="ask-intel-workspace__frame ask-intel-workspace__frame--fullheight">
          <ChatbotWidget variant="full" />
        </div>
      </div>
    </div>
  );
}
