/**
 * Event Horizon UI Components
 * 
 * High-contrast "Event Horizon" UI components designed for:
 * - 1500+ nit outdoor displays (sunlight readable)
 * - Resistive touchscreens (gloved operation)
 * - Industrial kiosk environments
 * 
 * Design Principles:
 * - Minimum 7:1 contrast ratio (WCAG AAA)
 * - Large touch targets (48px minimum, 64px preferred)
 * - Bold typography for outdoor visibility
 * - Limited color palette (reduce glare confusion)
 * - Clear visual hierarchy
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Theme Configuration
// ============================================================================

export const EVENT_HORIZON_THEME = {
  colors: {
    // Primary - high contrast blacks and whites
    background: '#000000',
    foreground: '#FFFFFF',
    
    // Accent - safety/industrial colors
    primary: '#00FF88',      // Bright green (GO)
    warning: '#FFB800',      // Amber (CAUTION)
    danger: '#FF3B3B',       // Red (STOP)
    info: '#00B4FF',         // Cyan (INFO)
    
    // Muted for secondary elements
    muted: '#3A3A3A',
    mutedForeground: '#A0A0A0',
    
    // Status indicators
    success: '#00FF88',
    error: '#FF3B3B',
    pending: '#FFB800',
  },
  
  typography: {
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    
    // Sizes optimized for outdoor viewing at arm's length
    fontSize: {
      xs: '14px',
      sm: '18px',
      base: '24px',
      lg: '32px',
      xl: '48px',
      '2xl': '64px',
      '3xl': '96px',
    },
    
    fontWeight: {
      normal: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
  },
  
  spacing: {
    // Touch targets
    touchTarget: '64px', // Minimum for gloved operation
    touchTargetMin: '48px',
    
    // Padding
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },
  
  borders: {
    radius: '12px',
    radiusLg: '20px',
    width: '3px',
  },
};

// ============================================================================
// CSS Variables Injector
// ============================================================================

export const EventHorizonStyles = () => (
  <style jsx global>{`
    :root {
      --eh-bg: ${EVENT_HORIZON_THEME.colors.background};
      --eh-fg: ${EVENT_HORIZON_THEME.colors.foreground};
      --eh-primary: ${EVENT_HORIZON_THEME.colors.primary};
      --eh-warning: ${EVENT_HORIZON_THEME.colors.warning};
      --eh-danger: ${EVENT_HORIZON_THEME.colors.danger};
      --eh-info: ${EVENT_HORIZON_THEME.colors.info};
      --eh-muted: ${EVENT_HORIZON_THEME.colors.muted};
      --eh-muted-fg: ${EVENT_HORIZON_THEME.colors.mutedForeground};
    }
    
    .event-horizon {
      background: var(--eh-bg);
      color: var(--eh-fg);
      font-family: ${EVENT_HORIZON_THEME.typography.fontFamily};
      font-size: ${EVENT_HORIZON_THEME.typography.fontSize.base};
      font-weight: ${EVENT_HORIZON_THEME.typography.fontWeight.normal};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .event-horizon * {
      box-sizing: border-box;
    }
    
    /* High contrast text rendering */
    .event-horizon {
      text-rendering: optimizeLegibility;
      font-feature-settings: 'kern' 1, 'liga' 1;
    }
    
    /* Disable text selection for kiosk */
    .event-horizon.kiosk-mode {
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    
    /* Large touch area styles */
    .event-horizon button,
    .event-horizon .touch-target {
      min-height: ${EVENT_HORIZON_THEME.spacing.touchTarget};
      min-width: ${EVENT_HORIZON_THEME.spacing.touchTarget};
    }
  `}</style>
);

// ============================================================================
// Container Components
// ============================================================================

interface EventHorizonContainerProps {
  children: React.ReactNode;
  kioskMode?: boolean;
  className?: string;
}

export const EventHorizonContainer: React.FC<EventHorizonContainerProps> = ({
  children,
  kioskMode = true,
  className = '',
}) => {
  return (
    <div className={`event-horizon ${kioskMode ? 'kiosk-mode' : ''} ${className}`}>
      <EventHorizonStyles />
      {children}
    </div>
  );
};

// ============================================================================
// Gate Check-In Screen
// ============================================================================

interface GateCheckInScreenProps {
  facilityName: string;
  gateNumber: string | number;
  onDriverCheckIn: () => void;
  onManualEntry: () => void;
  currentTime?: Date;
  truckCount?: number;
  averageWaitMinutes?: number;
}

export const GateCheckInScreen: React.FC<GateCheckInScreenProps> = ({
  facilityName,
  gateNumber,
  onDriverCheckIn,
  onManualEntry,
  currentTime = new Date(),
  truckCount = 0,
  averageWaitMinutes = 0,
}) => {
  const [time, setTime] = useState(currentTime);
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <EventHorizonContainer>
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: EVENT_HORIZON_THEME.spacing.lg,
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: EVENT_HORIZON_THEME.spacing.xl,
        }}>
          <div>
            <div style={{
              fontSize: EVENT_HORIZON_THEME.typography.fontSize.lg,
              fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
              color: EVENT_HORIZON_THEME.colors.primary,
            }}>
              {facilityName}
            </div>
            <div style={{
              fontSize: EVENT_HORIZON_THEME.typography.fontSize.base,
              color: EVENT_HORIZON_THEME.colors.mutedForeground,
            }}>
              Gate {gateNumber}
            </div>
          </div>
          <div style={{
            fontSize: EVENT_HORIZON_THEME.typography.fontSize['2xl'],
            fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.black,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>
        
        {/* Main Content */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: EVENT_HORIZON_THEME.spacing.xl,
        }}>
          {/* Welcome Message */}
          <h1 style={{
            fontSize: EVENT_HORIZON_THEME.typography.fontSize['3xl'],
            fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.black,
            textAlign: 'center',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Driver Check-In
          </h1>
          
          {/* Primary Action Button */}
          <EHButton
            variant="primary"
            size="xl"
            onClick={onDriverCheckIn}
            icon={<ScanIcon />}
          >
            SCAN APPOINTMENT
          </EHButton>
          
          {/* Secondary Action */}
          <EHButton
            variant="secondary"
            size="lg"
            onClick={onManualEntry}
          >
            MANUAL ENTRY
          </EHButton>
        </main>
        
        {/* Status Bar */}
        <footer style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: EVENT_HORIZON_THEME.spacing.md,
          backgroundColor: EVENT_HORIZON_THEME.colors.muted,
          borderRadius: EVENT_HORIZON_THEME.borders.radiusLg,
        }}>
          <StatusIndicator
            label="Trucks on Site"
            value={truckCount}
            status={truckCount > 50 ? 'warning' : 'normal'}
          />
          <StatusIndicator
            label="Avg Wait"
            value={`${averageWaitMinutes} min`}
            status={averageWaitMinutes > 30 ? 'warning' : 'normal'}
          />
          <StatusIndicator
            label="System"
            value="Online"
            status="success"
          />
        </footer>
      </div>
    </EventHorizonContainer>
  );
};

// ============================================================================
// Dock Assignment Screen
// ============================================================================

interface DockAssignment {
  dockNumber: number;
  status: 'available' | 'assigned' | 'occupied' | 'blocked';
  eta?: number; // minutes
  trailerId?: string;
}

interface DockAssignmentScreenProps {
  appointment: {
    id: string;
    trailerId: string;
    driverName: string;
    carrier: string;
    appointmentType: 'inbound' | 'outbound';
  };
  assignedDock: number;
  estimatedWait: number;
  onConfirm: () => void;
  onRequestHelp: () => void;
  mapUrl?: string;
}

export const DockAssignmentScreen: React.FC<DockAssignmentScreenProps> = ({
  appointment,
  assignedDock,
  estimatedWait,
  onConfirm,
  onRequestHelp,
}) => {
  return (
    <EventHorizonContainer>
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: EVENT_HORIZON_THEME.spacing.lg,
      }}>
        {/* Success Banner */}
        <div style={{
          backgroundColor: EVENT_HORIZON_THEME.colors.primary,
          color: EVENT_HORIZON_THEME.colors.background,
          padding: EVENT_HORIZON_THEME.spacing.md,
          borderRadius: EVENT_HORIZON_THEME.borders.radius,
          textAlign: 'center',
          marginBottom: EVENT_HORIZON_THEME.spacing.lg,
        }}>
          <div style={{
            fontSize: EVENT_HORIZON_THEME.typography.fontSize.lg,
            fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
          }}>
            ✓ CHECK-IN COMPLETE
          </div>
        </div>
        
        {/* Dock Assignment Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: EVENT_HORIZON_THEME.spacing.lg,
        }}>
          <div style={{
            fontSize: EVENT_HORIZON_THEME.typography.fontSize.xl,
            color: EVENT_HORIZON_THEME.colors.mutedForeground,
          }}>
            PROCEED TO DOCK
          </div>
          
          <div style={{
            fontSize: '180px',
            fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.black,
            color: EVENT_HORIZON_THEME.colors.primary,
            lineHeight: 1,
            textShadow: `0 0 60px ${EVENT_HORIZON_THEME.colors.primary}40`,
          }}>
            {assignedDock}
          </div>
          
          {/* Appointment Summary */}
          <div style={{
            backgroundColor: EVENT_HORIZON_THEME.colors.muted,
            padding: EVENT_HORIZON_THEME.spacing.lg,
            borderRadius: EVENT_HORIZON_THEME.borders.radiusLg,
            width: '100%',
            maxWidth: '600px',
          }}>
            <InfoRow label="Trailer" value={appointment.trailerId} />
            <InfoRow label="Carrier" value={appointment.carrier} />
            <InfoRow label="Type" value={appointment.appointmentType.toUpperCase()} />
            <InfoRow 
              label="Est. Wait" 
              value={`${estimatedWait} min`}
              highlight={estimatedWait > 15}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: EVENT_HORIZON_THEME.spacing.md,
        }}>
          <EHButton
            variant="primary"
            size="lg"
            onClick={onConfirm}
            fullWidth
          >
            CONFIRM & PROCEED
          </EHButton>
          <EHButton
            variant="secondary"
            size="lg"
            onClick={onRequestHelp}
          >
            HELP
          </EHButton>
        </div>
      </div>
    </EventHorizonContainer>
  );
};

// ============================================================================
// Button Component
// ============================================================================

interface EHButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'lg' | 'xl';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const EHButton: React.FC<EHButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  onClick,
  disabled = false,
  fullWidth = false,
  icon,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const sizeStyles = {
    md: {
      padding: `${EVENT_HORIZON_THEME.spacing.sm} ${EVENT_HORIZON_THEME.spacing.md}`,
      fontSize: EVENT_HORIZON_THEME.typography.fontSize.base,
      minHeight: EVENT_HORIZON_THEME.spacing.touchTargetMin,
    },
    lg: {
      padding: `${EVENT_HORIZON_THEME.spacing.md} ${EVENT_HORIZON_THEME.spacing.lg}`,
      fontSize: EVENT_HORIZON_THEME.typography.fontSize.lg,
      minHeight: EVENT_HORIZON_THEME.spacing.touchTarget,
    },
    xl: {
      padding: `${EVENT_HORIZON_THEME.spacing.lg} ${EVENT_HORIZON_THEME.spacing.xl}`,
      fontSize: EVENT_HORIZON_THEME.typography.fontSize.xl,
      minHeight: '96px',
    },
  };
  
  const variantStyles = {
    primary: {
      background: EVENT_HORIZON_THEME.colors.primary,
      color: EVENT_HORIZON_THEME.colors.background,
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: EVENT_HORIZON_THEME.colors.foreground,
      border: `${EVENT_HORIZON_THEME.borders.width} solid ${EVENT_HORIZON_THEME.colors.foreground}`,
    },
    danger: {
      background: EVENT_HORIZON_THEME.colors.danger,
      color: EVENT_HORIZON_THEME.colors.foreground,
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: EVENT_HORIZON_THEME.colors.mutedForeground,
      border: 'none',
    },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: EVENT_HORIZON_THEME.spacing.sm,
        borderRadius: EVENT_HORIZON_THEME.borders.radiusLg,
        fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s ease, opacity 0.1s ease',
        width: fullWidth ? '100%' : 'auto',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontFamily: EVENT_HORIZON_THEME.typography.fontFamily,
      }}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
};

// ============================================================================
// Status Indicator Component
// ============================================================================

interface StatusIndicatorProps {
  label: string;
  value: string | number;
  status?: 'normal' | 'success' | 'warning' | 'error';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  value,
  status = 'normal',
}) => {
  const statusColors = {
    normal: EVENT_HORIZON_THEME.colors.foreground,
    success: EVENT_HORIZON_THEME.colors.success,
    warning: EVENT_HORIZON_THEME.colors.warning,
    error: EVENT_HORIZON_THEME.colors.error,
  };
  
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: EVENT_HORIZON_THEME.typography.fontSize.sm,
        color: EVENT_HORIZON_THEME.colors.mutedForeground,
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: EVENT_HORIZON_THEME.typography.fontSize.lg,
        fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
        color: statusColors[status],
      }}>
        {value}
      </div>
    </div>
  );
};

// ============================================================================
// Info Row Component
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, highlight = false }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${EVENT_HORIZON_THEME.spacing.sm} 0`,
    borderBottom: `1px solid ${EVENT_HORIZON_THEME.colors.muted}`,
  }}>
    <span style={{
      color: EVENT_HORIZON_THEME.colors.mutedForeground,
      fontSize: EVENT_HORIZON_THEME.typography.fontSize.base,
    }}>
      {label}
    </span>
    <span style={{
      fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
      color: highlight ? EVENT_HORIZON_THEME.colors.warning : EVENT_HORIZON_THEME.colors.foreground,
      fontSize: EVENT_HORIZON_THEME.typography.fontSize.base,
    }}>
      {value}
    </span>
  </div>
);

// ============================================================================
// Numpad Component (for manual entry)
// ============================================================================

interface NumpadProps {
  onInput: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  value: string;
  maxLength?: number;
  placeholder?: string;
}

export const Numpad: React.FC<NumpadProps> = ({
  onInput,
  onClear,
  onSubmit,
  value,
  maxLength = 10,
  placeholder = 'Enter Appointment #',
}) => {
  const handleKeyPress = useCallback((key: string) => {
    if (value.length < maxLength) {
      onInput(value + key);
    }
  }, [value, maxLength, onInput]);
  
  const handleBackspace = useCallback(() => {
    onInput(value.slice(0, -1));
  }, [value, onInput]);
  
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'];
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: EVENT_HORIZON_THEME.spacing.md,
      width: '100%',
      maxWidth: '400px',
    }}>
      {/* Display */}
      <div style={{
        backgroundColor: EVENT_HORIZON_THEME.colors.muted,
        padding: EVENT_HORIZON_THEME.spacing.lg,
        borderRadius: EVENT_HORIZON_THEME.borders.radius,
        textAlign: 'center',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: EVENT_HORIZON_THEME.typography.fontSize['2xl'],
          fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.1em',
          color: value ? EVENT_HORIZON_THEME.colors.foreground : EVENT_HORIZON_THEME.colors.mutedForeground,
        }}>
          {value || placeholder}
        </span>
      </div>
      
      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: EVENT_HORIZON_THEME.spacing.sm,
      }}>
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'CLR') onClear();
              else if (key === '⌫') handleBackspace();
              else handleKeyPress(key);
            }}
            style={{
              height: EVENT_HORIZON_THEME.spacing.touchTarget,
              fontSize: EVENT_HORIZON_THEME.typography.fontSize.xl,
              fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
              backgroundColor: key === 'CLR' 
                ? EVENT_HORIZON_THEME.colors.danger 
                : EVENT_HORIZON_THEME.colors.muted,
              color: EVENT_HORIZON_THEME.colors.foreground,
              border: 'none',
              borderRadius: EVENT_HORIZON_THEME.borders.radius,
              cursor: 'pointer',
              fontFamily: EVENT_HORIZON_THEME.typography.fontFamily,
            }}
          >
            {key}
          </button>
        ))}
      </div>
      
      {/* Submit Button */}
      <EHButton
        variant="primary"
        size="xl"
        onClick={onSubmit}
        disabled={value.length === 0}
        fullWidth
      >
        SUBMIT
      </EHButton>
    </div>
  );
};

// ============================================================================
// Yard Map Display Component
// ============================================================================

interface YardMapProps {
  assignedDock: number;
  currentPosition?: { x: number; y: number };
  docks: Array<{ number: number; status: 'available' | 'occupied' | 'assigned' }>;
  width?: number;
  height?: number;
}

export const YardMap: React.FC<YardMapProps> = ({
  assignedDock,
  currentPosition,
  docks,
  width = 600,
  height = 400,
}) => {
  return (
    <div style={{
      backgroundColor: EVENT_HORIZON_THEME.colors.muted,
      borderRadius: EVENT_HORIZON_THEME.borders.radiusLg,
      padding: EVENT_HORIZON_THEME.spacing.md,
      position: 'relative',
    }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Yard outline */}
        <rect
          x={10}
          y={10}
          width={width - 20}
          height={height - 20}
          fill="none"
          stroke={EVENT_HORIZON_THEME.colors.mutedForeground}
          strokeWidth={2}
        />
        
        {/* Docks */}
        {docks.map((dock, i) => {
          const dockWidth = 40;
          const dockHeight = 30;
          const x = 20 + (i * (dockWidth + 10));
          const y = height - 50;
          
          const isAssigned = dock.number === assignedDock;
          const fill = isAssigned 
            ? EVENT_HORIZON_THEME.colors.primary 
            : dock.status === 'occupied'
              ? EVENT_HORIZON_THEME.colors.danger
              : EVENT_HORIZON_THEME.colors.muted;
          
          return (
            <g key={dock.number}>
              <rect
                x={x}
                y={y}
                width={dockWidth}
                height={dockHeight}
                fill={fill}
                stroke={EVENT_HORIZON_THEME.colors.foreground}
                strokeWidth={isAssigned ? 3 : 1}
              />
              <text
                x={x + dockWidth / 2}
                y={y + dockHeight / 2 + 5}
                textAnchor="middle"
                fill={isAssigned ? EVENT_HORIZON_THEME.colors.background : EVENT_HORIZON_THEME.colors.foreground}
                fontSize={isAssigned ? 16 : 12}
                fontWeight={isAssigned ? 'bold' : 'normal'}
              >
                {dock.number}
              </text>
            </g>
          );
        })}
        
        {/* Route arrow to assigned dock */}
        {currentPosition && (
          <>
            <circle
              cx={currentPosition.x}
              cy={currentPosition.y}
              r={8}
              fill={EVENT_HORIZON_THEME.colors.info}
            />
            <text
              x={currentPosition.x}
              y={currentPosition.y - 15}
              textAnchor="middle"
              fill={EVENT_HORIZON_THEME.colors.info}
              fontSize={12}
            >
              YOU
            </text>
          </>
        )}
        
        {/* Legend */}
        <g transform={`translate(${width - 150}, 20)`}>
          <rect width={10} height={10} fill={EVENT_HORIZON_THEME.colors.primary} />
          <text x={15} y={9} fill={EVENT_HORIZON_THEME.colors.foreground} fontSize={10}>Your Dock</text>
          
          <rect y={15} width={10} height={10} fill={EVENT_HORIZON_THEME.colors.danger} />
          <text x={15} y={24} fill={EVENT_HORIZON_THEME.colors.foreground} fontSize={10}>Occupied</text>
          
          <rect y={30} width={10} height={10} fill={EVENT_HORIZON_THEME.colors.muted} />
          <text x={15} y={39} fill={EVENT_HORIZON_THEME.colors.foreground} fontSize={10}>Available</text>
        </g>
      </svg>
    </div>
  );
};

// ============================================================================
// Icon Components
// ============================================================================

const ScanIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

// ============================================================================
// Alert/Toast Component
// ============================================================================

interface EHAlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  onDismiss?: () => void;
}

export const EHAlert: React.FC<EHAlertProps> = ({
  type,
  title,
  message,
  onDismiss,
}) => {
  const colors = {
    success: EVENT_HORIZON_THEME.colors.success,
    warning: EVENT_HORIZON_THEME.colors.warning,
    error: EVENT_HORIZON_THEME.colors.error,
    info: EVENT_HORIZON_THEME.colors.info,
  };
  
  return (
    <div style={{
      backgroundColor: colors[type],
      color: type === 'warning' ? EVENT_HORIZON_THEME.colors.background : EVENT_HORIZON_THEME.colors.foreground,
      padding: EVENT_HORIZON_THEME.spacing.lg,
      borderRadius: EVENT_HORIZON_THEME.borders.radiusLg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{
          fontSize: EVENT_HORIZON_THEME.typography.fontSize.lg,
          fontWeight: EVENT_HORIZON_THEME.typography.fontWeight.bold,
        }}>
          {title}
        </div>
        {message && (
          <div style={{
            fontSize: EVENT_HORIZON_THEME.typography.fontSize.base,
            marginTop: '4px',
            opacity: 0.9,
          }}>
            {message}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: EVENT_HORIZON_THEME.typography.fontSize.xl,
            cursor: 'pointer',
            padding: EVENT_HORIZON_THEME.spacing.sm,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Loading Spinner
// ============================================================================

export const EHSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = { sm: 24, md: 48, lg: 80 };
  const s = sizes[size];
  
  return (
    <svg width={s} height={s} viewBox="0 0 50 50" style={{ animation: 'eh-spin 1s linear infinite' }}>
      <style>{`
        @keyframes eh-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <circle
        cx={25}
        cy={25}
        r={20}
        fill="none"
        stroke={EVENT_HORIZON_THEME.colors.muted}
        strokeWidth={4}
      />
      <circle
        cx={25}
        cy={25}
        r={20}
        fill="none"
        stroke={EVENT_HORIZON_THEME.colors.primary}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="80, 200"
      />
    </svg>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default {
  EventHorizonContainer,
  GateCheckInScreen,
  DockAssignmentScreen,
  EHButton,
  StatusIndicator,
  Numpad,
  YardMap,
  EHAlert,
  EHSpinner,
  EVENT_HORIZON_THEME,
};
