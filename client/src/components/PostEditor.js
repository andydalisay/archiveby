import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';

function PostEditor({ onClose, onSave }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('');
  const [tripType, setTripType] = useState('Adventure');
  const [hashtags, setHashtags] = useState('');
  const [canvasBlocks, setCanvasBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImageSettings, setPendingImageSettings] = useState({
    shape: 'square',
    rounded: false,
    darken: false,
    url: ''
  });

  const componentTypes = {
    text: [
      { id: 'title', label: 'Title', defaultContent: 'Title' },
      { id: 'subtitle', label: 'Subtitle', defaultContent: 'Subtitle' },
      { id: 'body', label: 'Body', defaultContent: 'Body text' }
    ],
    others: [
      { id: 'image', label: 'Image', icon: '🖼️' },
      { id: 'calendar', label: 'Calendar', icon: '📅' },
      { id: 'map', label: 'Map', icon: '📍' }
    ]
  };

  const addBlockToCanvas = (type, subtype = null) => {
    // If it's an image, show the modal instead
    if (type === 'image') {
      setShowImageModal(true);
      setPendingImageSettings({
        shape: 'square',
        rounded: false,
        darken: false,
        url: ''
      });
      return;
    }

    const newBlock = {
      id: Date.now(),
      type,
      subtype: subtype || type,
      x: 100,
      y: 100,
      width: type === 'text' ? 300 : 200,
      height: type === 'text' ? 60 : 200,
      rotation: 0,
      content: type === 'text' ? (subtype === 'title' ? 'Title' : subtype === 'subtitle' ? 'Subtitle' : 'Body text') : '',
      settings: type === 'image' ? { shape: 'square', rounded: false, darken: false, url: '' } : {}
    };
    setCanvasBlocks([...canvasBlocks, newBlock]);
    setSelectedBlock(newBlock.id);
  };

  const handleConfirmImage = () => {
    if (!pendingImageSettings.url) {
      alert('Please upload an image first');
      return;
    }

    const newBlock = {
      id: Date.now(),
      type: 'image',
      subtype: 'image',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      content: '',
      settings: pendingImageSettings
    };
    setCanvasBlocks([...canvasBlocks, newBlock]);
    setSelectedBlock(newBlock.id);
    setShowImageModal(false);
    setPendingImageSettings({
      shape: 'square',
      rounded: false,
      darken: false,
      url: ''
    });
  };

  const updateBlockSettings = (id, setting, value) => {
    setCanvasBlocks(blocks =>
      blocks.map(block =>
        block.id === id
          ? { ...block, settings: { ...block.settings, [setting]: value } }
          : block
      )
    );
  };

  const handleCanvasMouseDown = (e, blockId) => {
    if (e.target.classList.contains('resize-handle')) {
      setIsResizing(true);
      setSelectedBlock(blockId);
      return;
    }

    if (e.target.classList.contains('rotate-handle')) {
      setIsRotating(true);
      setSelectedBlock(blockId);
      return;
    }

    const canvas = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setSelectedBlock(blockId);
    setDragStart({
      x: e.clientX - canvas.left,
      y: e.clientY - canvas.top
    });
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging && !isResizing && !isRotating) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvas.left;
    const mouseY = e.clientY - canvas.top;

    if (isDragging) {
      setCanvasBlocks(blocks =>
        blocks.map(block =>
          block.id === selectedBlock
            ? { ...block, x: mouseX - 50, y: mouseY - 20 }
            : block
        )
      );
    } else if (isResizing) {
      setCanvasBlocks(blocks =>
        blocks.map(block => {
          if (block.id === selectedBlock) {
            const newWidth = Math.max(100, mouseX - block.x);
            const newHeight = Math.max(50, mouseY - block.y);
            return { ...block, width: newWidth, height: newHeight };
          }
          return block;
        })
      );
    } else if (isRotating) {
      setCanvasBlocks(blocks =>
        blocks.map(block => {
          if (block.id === selectedBlock) {
            const centerX = block.x + block.width / 2;
            const centerY = block.y + block.height / 2;
            const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
            return { ...block, rotation: angle + 90 };
          }
          return block;
        })
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
  };

  const updateBlockContent = (id, content) => {
    setCanvasBlocks(blocks =>
      blocks.map(block =>
        block.id === id ? { ...block, content } : block
      )
    );
  };

  const uploadImage = async (file, blockId = null) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `post-images/${fileName}`;

      const { error } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (error) {
        alert('Error uploading image: ' + error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      // If blockId is provided, update existing block
      if (blockId) {
        setCanvasBlocks(blocks =>
          blocks.map(block =>
            block.id === blockId
              ? { ...block, settings: { ...block.settings, url: publicUrl } }
              : block
          )
        );
      } else {
        // Otherwise, update pending settings for modal
        setPendingImageSettings(prev => ({ ...prev, url: publicUrl }));
      }
    } catch (error) {
      alert('Error processing image: ' + error.message);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please add a title');
      return;
    }
    if (!country.trim()) {
      alert('Please add a country');
      return;
    }
    if (!duration.trim()) {
      alert('Please add duration');
      return;
    }

    // Convert canvas blocks to the format expected by the feed
    // Make sure the first image with URL becomes the cover photo
    const sortedBlocks = [...canvasBlocks];
    const firstImageIndex = sortedBlocks.findIndex(b => b.type === 'image' && b.settings?.url);

    if (firstImageIndex > 0) {
      // Move first image to the beginning
      const firstImage = sortedBlocks.splice(firstImageIndex, 1)[0];
      sortedBlocks.unshift(firstImage);
    }

    const blocks = sortedBlocks.map(block => ({
      id: block.id,
      type: block.type,
      content: block.content,
      settings: block.settings || {},
      url: block.settings?.url || null,
      alt: 'Post image'
    }));

    onSave({
      title,
      blocks,
      country: country.trim(),
      duration: duration.trim(),
      tripType,
      hashtags: hashtags.trim(),
    });
  };

  const renderCanvasBlock = (block) => {
    const isSelected = selectedBlock === block.id;

    const blockStyle = {
      position: 'absolute',
      left: `${block.x}px`,
      top: `${block.y}px`,
      width: `${block.width}px`,
      height: `${block.height}px`,
      transform: `rotate(${block.rotation}deg)`,
      cursor: 'move',
      border: isSelected ? '2px solid #4A90E2' : '2px dashed transparent',
      boxSizing: 'border-box',
    };

    let content;
    if (block.type === 'text') {
      content = (
        <input
          type="text"
          value={block.content}
          onChange={(e) => updateBlockContent(block.id, e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            fontSize: block.subtype === 'title' ? '2rem' : block.subtype === 'subtitle' ? '1.5rem' : '1rem',
            fontWeight: block.subtype === 'title' ? 'bold' : 'normal',
            outline: 'none',
            color: colors.text,
          }}
        />
      );
    } else if (block.type === 'image') {
      content = block.settings.url ? (
        <img
          src={block.settings.url}
          alt="Block"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            aspectRatio: block.settings.shape === 'square' ? '1/1' :
                        block.settings.shape === '4:3' ? '4/3' :
                        block.settings.shape === '16:9' ? '16/9' : '1/1',
            borderRadius: block.settings.rounded ? '16px' :
                         block.settings.shape === 'polaroid' ? '8px' : '0',
            padding: block.settings.shape === 'polaroid' ? '12px 12px 40px 12px' : '0',
            backgroundColor: block.settings.shape === 'polaroid' ? 'white' : 'transparent',
            boxShadow: block.settings.shape === 'polaroid' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            filter: block.settings.darken ? 'brightness(0.7)' : 'none',
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.background,
          border: `2px dashed ${colors.border}`
        }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadImage(e.target.files[0], block.id)}
            style={{ fontSize: '0.8rem' }}
          />
        </div>
      );
    } else if (block.type === 'calendar') {
      content = (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.background,
          fontSize: '2rem'
        }}>
          📅
        </div>
      );
    } else if (block.type === 'map') {
      content = (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.background,
          fontSize: '2rem'
        }}>
          📍
        </div>
      );
    }

    return (
      <div
        key={block.id}
        style={blockStyle}
        onMouseDown={(e) => handleCanvasMouseDown(e, block.id)}
      >
        {content}
        {isSelected && (
          <>
            <div
              className="resize-handle"
              style={{
                position: 'absolute',
                right: '-6px',
                bottom: '-6px',
                width: '12px',
                height: '12px',
                background: '#4A90E2',
                cursor: 'nwse-resize',
                borderRadius: '50%',
              }}
            />
            <div
              className="rotate-handle"
              style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '20px',
                height: '20px',
                background: '#4A90E2',
                cursor: 'grab',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.7rem',
              }}
            >
              ↻
            </div>
          </>
        )}
      </div>
    );
  };

  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.background,
      display: 'flex',
      zIndex: 1000,
    },
    sidebar: {
      width: '320px',
      background: colors.cardBackground,
      padding: '2rem 1.5rem',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      boxShadow: '2px 0 12px rgba(0,0,0,0.08)',
    },
    sidebarTitle: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: colors.text,
      margin: 0,
      marginBottom: '0.5rem',
    },
    label: {
      fontSize: '0.85rem',
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.95rem',
      background: colors.background,
      color: colors.text,
      outline: 'none',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
    },
    select: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.95rem',
      background: colors.background,
      color: colors.text,
      outline: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
    },
    componentsSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginTop: '1rem',
    },
    componentGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.625rem',
    },
    componentButton: {
      padding: '0.875rem 1rem',
      background: colors.background,
      border: `1.5px dashed ${colors.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: '500',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      color: colors.text,
    },
    publishButton: {
      padding: '1rem 1.5rem',
      background: colors.pink,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: 'auto',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    canvasContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: colors.background,
    },
    canvasHeader: {
      padding: '1.5rem 2rem',
      background: colors.cardBackground,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    canvas: {
      flex: 1,
      background: colors.background,
      position: 'relative',
      overflow: 'auto',
      padding: '2rem',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Blog</h2>

        <div>
          <div style={styles.label}>Title</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title..."
            style={styles.input}
          />
        </div>

        <div>
          <div style={styles.label}>Country</div>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., Japan"
            style={styles.input}
          />
        </div>

        <div>
          <div style={styles.label}>Duration</div>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 1 week"
            style={styles.input}
          />
        </div>

        <div>
          <div style={styles.label}>Type</div>
          <select value={tripType} onChange={(e) => setTripType(e.target.value)} style={styles.select}>
            <option value="Luxury">Luxury</option>
            <option value="Adventure">Adventure</option>
            <option value="Casual">Casual</option>
            <option value="Wellness">Wellness</option>
            <option value="Eco">Eco</option>
          </select>
        </div>

        <div>
          <div style={styles.label}>Hashtags</div>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#fun #beach"
            style={styles.input}
          />
        </div>


        <div style={styles.componentsSection}>
          <div style={styles.label}>Components</div>

          <div style={styles.componentGroup}>
            <strong style={{ fontSize: '0.8rem', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Text</strong>
            {componentTypes.text.map(comp => (
              <button
                key={comp.id}
                onClick={() => addBlockToCanvas('text', comp.id)}
                style={styles.componentButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.pink;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = colors.pink;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background;
                  e.currentTarget.style.color = colors.text;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                {comp.label}
              </button>
            ))}
          </div>

          <div style={styles.componentGroup}>
            <strong style={{ fontSize: '0.8rem', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Others</strong>
            {componentTypes.others.map(comp => (
              <button
                key={comp.id}
                onClick={() => addBlockToCanvas(comp.id)}
                style={styles.componentButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.pink;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = colors.pink;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background;
                  e.currentTarget.style.color = colors.text;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                {comp.icon} {comp.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={styles.publishButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        >
          Publish!
        </button>
      </div>

      <div style={styles.canvasContainer}>
        <div style={styles.canvasHeader}>
          <h2 style={{ margin: 0, color: colors.text, fontSize: '1.5rem', fontWeight: '700' }}>Canvas</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '60px' }}>
            <span style={{ fontSize: '0.9rem', color: colors.textSecondary, fontWeight: '500' }}>Desktop</span>
            <div style={{
              width: '50px',
              height: '24px',
              background: colors.border,
              borderRadius: '12px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                position: 'absolute',
                left: '2px',
                top: '2px',
                width: '20px',
                height: '20px',
                background: colors.cardBackground,
                borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.9rem', color: colors.textSecondary, fontWeight: '500' }}>Mobile</span>
          </div>
        </div>

        <div
          ref={canvasRef}
          style={styles.canvas}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {canvasBlocks.map(renderCanvasBlock)}
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: colors.cardBackground,
            borderRadius: '12px',
            padding: '2rem',
            width: '500px',
            maxWidth: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              color: colors.text,
              fontSize: '1.5rem',
              fontWeight: '700',
            }}>
              Add Image
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Image Upload */}
              <div>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                }}>
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    background: colors.background,
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                />
                {pendingImageSettings.url && (
                  <div style={{
                    marginTop: '1rem',
                  }}>
                    <div style={{
                      display: 'inline-block',
                      position: 'relative',
                      width: '100%',
                    }}>
                      <img
                        src={pendingImageSettings.url}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '250px',
                          objectFit: 'cover',
                          aspectRatio: pendingImageSettings.shape === 'square' ? '1/1' :
                                      pendingImageSettings.shape === '4:3' ? '4/3' :
                                      pendingImageSettings.shape === '16:9' ? '16/9' : '1/1',
                          borderRadius: pendingImageSettings.rounded ? '16px' :
                                       pendingImageSettings.shape === 'polaroid' ? '8px' : '0',
                          padding: pendingImageSettings.shape === 'polaroid' ? '12px 12px 40px 12px' : '0',
                          backgroundColor: pendingImageSettings.shape === 'polaroid' ? 'white' : 'transparent',
                          boxShadow: pendingImageSettings.shape === 'polaroid' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                          filter: pendingImageSettings.darken ? 'brightness(0.7)' : 'none',
                          display: 'block',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Shape */}
              <div>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                }}>
                  Shape
                </label>
                <select
                  value={pendingImageSettings.shape}
                  onChange={(e) => setPendingImageSettings(prev => ({ ...prev, shape: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    background: colors.background,
                    color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  <option value="square">Square</option>
                  <option value="4:3">4:3 Rectangle</option>
                  <option value="16:9">16:9 Rectangle</option>
                  <option value="polaroid">Polaroid Frame</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  color: colors.text,
                  fontWeight: '500',
                }}>
                  <input
                    type="checkbox"
                    checked={pendingImageSettings.rounded}
                    onChange={(e) => setPendingImageSettings(prev => ({ ...prev, rounded: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: colors.pink }}
                  />
                  Rounded corners
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  color: colors.text,
                  fontWeight: '500',
                }}>
                  <input
                    type="checkbox"
                    checked={pendingImageSettings.darken}
                    onChange={(e) => setPendingImageSettings(prev => ({ ...prev, darken: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: colors.pink }}
                  />
                  Darken image
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    setPendingImageSettings({
                      shape: 'square',
                      rounded: false,
                      darken: false,
                      url: ''
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '0.875rem 1.5rem',
                    background: colors.textSecondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImage}
                  style={{
                    flex: 1,
                    padding: '0.875rem 1.5rem',
                    background: colors.pink,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Add to Canvas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: colors.cardBackground,
          border: `1.5px solid ${colors.border}`,
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.text,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.danger;
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = colors.danger;
          e.currentTarget.style.transform = 'rotate(90deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.cardBackground;
          e.currentTarget.style.color = colors.text;
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.transform = 'rotate(0deg)';
        }}
      >
        ×
      </button>
    </div>
  );
}

export default PostEditor;
