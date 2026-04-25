import React, { forwardRef } from 'react';
import PawLogo from './PawLogo';
import { QRCodeCanvas } from 'qrcode.react';

interface PosterTemplateProps {
  diaryImage: string;
  contentText: string;
  authorName: string;
  authorAvatar: string;
  date: string;
  diaryUrl: string;
}

export const PosterTemplate = forwardRef<HTMLDivElement, PosterTemplateProps>(({
  diaryImage,
  contentText,
  authorName,
  authorAvatar,
  date,
  diaryUrl
}, ref) => {
  const baseTextStyle = {
    fontFamily: 'sans-serif',
  };

  const getCorsUrl = (url: string) => {
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  };

  return (
    <div style={{ position: 'fixed', left: '0px', top: '100%', zIndex: -1000, pointerEvents: 'none' }}>
      <div 
        ref={ref} 
        style={{
          width: '320px',
          backgroundColor: '#FFF9F5',
          padding: '20px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          ...baseTextStyle
        }}
      >
        <div style={{ backgroundColor: '#FFF9F5', padding: '8px', margin: '-8px' }}>
          {/* Author / Date Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src={getCorsUrl(authorAvatar)} 
                crossOrigin="anonymous" 
                alt="" 
                style={{ width: '40px', height: '40px', borderRadius: '9999px', border: '2px solid #FFFFFF' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#4A2E1B' }}>{authorName}</span>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#978275', letterSpacing: '0.05em' }}>{date}</span>
              </div>
            </div>
          </div>

          {/* Main Image */}
          {diaryImage && (
            <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '24px', overflow: 'hidden', backgroundColor: '#FFF0E5', marginBottom: '20px', position: 'relative', display: 'flex', flexShrink: 0 }}>
              <img src={getCorsUrl(diaryImage)} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Content text */}
          <div style={{ marginBottom: '24px', paddingLeft: '4px', paddingRight: '4px' }}>
            <p style={{ fontSize: '17px', fontWeight: 900, color: '#4A2E1B', lineHeight: '1.6', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
              {contentText || '生活中的小确幸...'}
            </p>
          </div>

          {/* Brand & QR code at bottom */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #F5EFEB', paddingLeft: '4px', paddingRight: '4px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', backgroundColor: '#FFB677', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                <PawLogo style={{ width: '24px', height: '24px', fill: 'currentColor' }} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1', color: '#4A2E1B' }}>
                Miao App<br/>
                <span style={{ color: '#978275', fontWeight: 700, letterSpacing: '0', marginTop: '4px', display: 'inline-block', textTransform: 'none' }}>分享猫咪的瞬间</span>
              </div>
            </div>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '6px', border: '1px solid #F5EFEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <QRCodeCanvas value={diaryUrl} size={46} level="L" fgColor="#4A2E1B" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
