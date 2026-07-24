'use client';

import React from 'react';
import styles from './seating.module.css';

interface SeatingLandmarkProps {
  type: 'stage' | 'dancefloor' | 'bridegroom' | 'desserts' | 'entrance';
  title: string;
  subtitle?: string;
}

export default function SeatingLandmark({ type, title, subtitle }: SeatingLandmarkProps) {
  let styleClass = styles.landmarkStage;

  if (type === 'dancefloor') styleClass = styles.landmarkDancefloor;
  if (type === 'bridegroom') styleClass = styles.landmarkBrideGroom;
  if (type === 'desserts') styleClass = styles.landmarkDesserts;
  if (type === 'entrance') styleClass = styles.landmarkEntrance;

  return (
    <div className={`${styles.landmark} ${styleClass}`}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </span>
      {subtitle && (
        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.8, marginTop: '2px' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
