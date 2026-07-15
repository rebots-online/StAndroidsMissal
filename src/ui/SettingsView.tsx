/**
 * SettingsView — full settings workspace (BD.1). The only owner of ThemePicker;
 * provides live semantic-token/material preview. Entity row P-S: no sidecar
 * dependency; preferences persist via ThemePicker's internal storage logic.
 */

import ThemePicker from './ThemePicker.tsx';

const PREVIEW_MATERIAL = [
  { role: 'rubric', la: '℟. Et cum spiritu tuo.', en: '℟. And with your spirit.' },
  { role: 'dialogue-p', la: '℣. Dóminus vobíscum.', en: '℣. The Lord be with you.' },
  { role: 'dialogue-s', la: '℣. Orémus.', en: '℣. Let us pray.' },
  { role: 'body', la: 'Omnípotens sempitérne Deus, qui quámdiu cum peculatóre dissénsit, converténdi eum tribuísti poténtiam, præsta, quæsumus, ut, qui Ecclésiam tuam in caritáte pacíficans régere dignáris, ab ómnibus se túere contráriis.', en: 'Almighty everlasting God, who, as long as He contended with the sinner, bestowed on him the power of being converted, grant, we beseech Thee, that Thou who deignest to rule Thy Church in the peace of charity, mayest guard it from all things contrary.' },
];

export default function SettingsView() {
  return (
    <div className="content settings-workspace">
      <h2>Settings</h2>
      
      <section className="settings-section">
        <h3>Appearance</h3>
        <p className="settings-desc">Choose a theme family and light/dark mode. Changes apply immediately across all surfaces.</p>
        <div className="settings-controls">
          <ThemePicker sidecar={null} />
        </div>
      </section>

      <section className="settings-section">
        <h3>Live Preview</h3>
        <p className="settings-desc">See how liturgical text roles appear in the selected theme:</p>
        <div className="theme-preview">
          {PREVIEW_MATERIAL.map((item, i) => (
            <div key={i} className={`preview-line preview-${item.role}`}>
              <span className="preview-la">{item.la}</span>
              {item.en && <span className="preview-en">{item.en}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}