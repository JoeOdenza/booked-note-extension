import { useState } from "react";


const fields = [
  { title: "Group", value: "Smith Family" },
  { title: "Branch number", value: "042" },
  { title: "Trip name", value: "Cancun Getaway" },
  { title: "Locator number", value: "LOC-88213" },
  { title: "Region destination", value: "Riviera Maya" }
];

export function ResCardInfo({ fields }) {
  const [copied, setCopied] = useState({});

  function handleCopy(field) {
    navigator.clipboard.writeText(field.value);
    setCopied((prev) => ({ ...prev, [field.title]: true }));
  }

  return (
    <div className="sidebar">
      {fields.map((field) => (
        <div className="field-row" key={field.title}>
          <label className="field-title">{field.title}</label>
          <input
            type="text"
            readOnly
            value={field.value}
            className={copied[field.title] ? "field-input copied" : "field-input"}
            onClick={() => handleCopy(field)}
          />
        </div>
      ))}
    </div>
  );
}
