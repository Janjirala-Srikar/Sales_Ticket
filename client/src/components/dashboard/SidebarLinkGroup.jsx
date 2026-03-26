import React, { useState } from 'react';

function SidebarLinkGroup({
  children,
  activecondition,
}) {
  const [open, setOpen] = useState(activecondition);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <div className="mb-0.5 last:mb-0">
      {children(handleClick, open)}
    </div>
  );
}

export default SidebarLinkGroup;
