import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';

function PostEditor({ onClose, onSave }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [country, setCountry] = useState('');
  const [duration, setDuration] = useState('');
  const [tripType, setTripType] = useState('Casual');
  const [hashtags, setHashtags] = useState('');

  const blockTypes = [
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'divider', label: 'Divider', icon: '➖' },
    { type: 'list', label: 'List', icon: '📋' },
    { type: 'checklist', label: 'Checklist', icon: '✅' },
    { type: 'map', label: 'Location', icon: '📍' },
  ];

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: '',
      settings: getDefaultSettings(type),
    };
    setBlocks([...blocks, newBlock]);
  };

  const getDefaultSettings = (type) => {
    switch (type) {
      case 'image':
        return { shape: 'square', rounded: false, url: '' };
      case 'list':
      case 'checklist':
        return { items: [''] };
      case 'map':
        return { country: '', lat: 0, lng: 0 };
      default:
        return {};
    }
  };

  const updateBlock = (id, field, value) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, [field]: value } : block
    ));
  };

  const updateBlockSettings = (id, setting, value) => {
    setBlocks(blocks.map(block =>
      block.id === id
        ? { ...block, settings: { ...block.settings, [setting]: value } }
        : block
    ));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);

    setBlocks(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate max dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Start with quality 0.8 and reduce if needed
          let quality = 0.8;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                // If under 500KB or quality is already very low, use this version
                if (blob.size <= 500 * 1024 || quality <= 0.3) {
                  resolve(blob);
                } else {
                  // Reduce quality and try again
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        };
      };
    });
  };

  const uploadImage = async (file, blockId) => {
    if (!file) return;

    try {
      // Compress the image first
      const compressedBlob = await compressImage(file);

      const fileExt = 'jpg'; // Always use jpg for compressed images
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `post-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('posts')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (error) {
        alert('Error uploading image: ' + error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      updateBlockSettings(blockId, 'url', publicUrl);
    } catch (error) {
      alert('Error processing image: ' + error.message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please add a title');
      return;
    }

    if (!country.trim()) {
      alert('Please add a country');
      return;
    }

    if (!duration.trim()) {
      alert('Please add duration (e.g., "5 days", "2 weeks")');
      return;
    }

    const postData = {
      title,
      blocks,
      type: 'blog',
      country: country.trim(),
      duration: duration.trim(),
      tripType,
      hashtags: hashtags.trim(),
    };

    onSave(postData);
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            value={block.content}
            onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
            placeholder="Write your text here..."
            style={styles.textarea}
            rows="4"
          />
        );

      case 'image':
        return (
          <div style={styles.imageBlock}>
            {block.settings.url ? (
              <img
                src={block.settings.url}
                alt="Post"
                style={{
                  ...styles.image,
                  aspectRatio: block.settings.shape === 'square' ? '1/1' :
                              block.settings.shape === '4:3' ? '4/3' : '16/9',
                  borderRadius: block.settings.rounded ? '16px' :
                               block.settings.shape === 'polaroid' ? '8px' : '0',
                  padding: block.settings.shape === 'polaroid' ? '12px 12px 40px 12px' : '0',
                  backgroundColor: block.settings.shape === 'polaroid' ? 'white' : 'transparent',
                  boxShadow: block.settings.shape === 'polaroid' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                }}
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e.target.files[0], block.id)}
                style={styles.fileInput}
              />
            )}
            <div style={styles.imageControls}>
              <select
                value={block.settings.shape}
                onChange={(e) => updateBlockSettings(block.id, 'shape', e.target.value)}
                style={styles.select}
              >
                <option value="square">Square</option>
                <option value="4:3">4:3 Rectangle</option>
                <option value="16:9">16:9 Rectangle</option>
                <option value="polaroid">Polaroid</option>
              </select>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={block.settings.rounded}
                  onChange={(e) => updateBlockSettings(block.id, 'rounded', e.target.checked)}
                />
                Rounded corners
              </label>
            </div>
          </div>
        );

      case 'divider':
        return <hr style={styles.divider} />;

      case 'list':
        return (
          <div style={styles.listBlock}>
            {block.settings.items.map((item, i) => (
              <div key={i} style={styles.listItem}>
                <span style={styles.bullet}>•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.settings.items];
                    newItems[i] = e.target.value;
                    updateBlockSettings(block.id, 'items', newItems);
                  }}
                  placeholder="List item..."
                  style={styles.listInput}
                />
              </div>
            ))}
            <button
              onClick={() => updateBlockSettings(block.id, 'items', [...block.settings.items, ''])}
              style={styles.addItemButton}
            >
              + Add item
            </button>
          </div>
        );

      case 'checklist':
        return (
          <div style={styles.listBlock}>
            {block.settings.items.map((item, i) => (
              <div key={i} style={styles.listItem}>
                <input type="checkbox" disabled style={styles.checkbox} />
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.settings.items];
                    newItems[i] = e.target.value;
                    updateBlockSettings(block.id, 'items', newItems);
                  }}
                  placeholder="Checklist item..."
                  style={styles.listInput}
                />
              </div>
            ))}
            <button
              onClick={() => updateBlockSettings(block.id, 'items', [...block.settings.items, ''])}
              style={styles.addItemButton}
            >
              + Add item
            </button>
          </div>
        );

      case 'map':
        return (
          <div style={styles.mapBlock}>
            <input
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
              placeholder="Location name (e.g., Paris, France)"
              style={styles.input}
            />
            <div style={styles.mapPlaceholder}>
              📍 {block.content || 'Location will appear here'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(30, 58, 95, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '2rem 0',
    },
    modal: {
      background: colors.cardBackground,
      borderRadius: '16px',
      maxWidth: '900px',
      width: '95%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: `0 8px 32px ${colors.shadowLg}`,
      border: `1px solid ${colors.border}`,
      margin: 'auto',
    },
    header: {
      padding: '1.5rem',
      borderBottom: `1.5px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      color: colors.text,
      fontSize: '1.35rem',
      fontWeight: 'bold',
    },
    headerButtons: {
      display: 'flex',
      gap: '0.625rem',
    },
    button: {
      padding: '0.5rem 0.875rem',
      background: colors.navy,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    saveButton: {
      padding: '0.5rem 0.875rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '1.5rem',
    },
    titleInput: {
      width: '100%',
      padding: '0.875rem 1.125rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '10px',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      background: colors.background,
      color: colors.text,
      fontFamily: 'inherit',
      marginBottom: '1rem',
      outline: 'none',
    },
    metadataSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      marginBottom: '1.5rem',
      padding: '1rem',
      background: colors.background,
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
    },
    metadataRow: {
      display: 'flex',
      gap: '0.75rem',
    },
    metadataInput: {
      flex: 1,
      padding: '0.75rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: colors.cardBackground,
      color: colors.text,
      outline: 'none',
    },
    metadataSelect: {
      flex: 1,
      padding: '0.75rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: colors.cardBackground,
      color: colors.text,
      outline: 'none',
      cursor: 'pointer',
    },
    blockTypeSelector: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
      marginBottom: '1.5rem',
      padding: '1rem',
      background: colors.background,
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
    },
    blockTypeButton: {
      padding: '0.5rem 0.875rem',
      background: colors.cardBackground,
      color: colors.text,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    blocksContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    block: {
      background: colors.cardBackground,
      padding: '1.25rem',
      borderRadius: '10px',
      border: `1.5px solid ${colors.border}`,
      cursor: 'move',
      transition: 'all 0.2s ease',
    },
    blockHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
    },
    blockType: {
      fontSize: '0.85rem',
      color: colors.textSecondary,
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    deleteButton: {
      padding: '0.35rem 0.625rem',
      background: colors.danger,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '600',
    },
    textarea: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.95rem',
      background: colors.background,
      color: colors.text,
      fontFamily: 'inherit',
      resize: 'vertical',
      outline: 'none',
      minHeight: '100px',
    },
    imageBlock: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    image: {
      width: '100%',
      maxWidth: '600px',
      objectFit: 'cover',
      display: 'block',
      margin: '0 auto',
    },
    imageControls: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
    },
    select: {
      padding: '0.5rem 0.75rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.85rem',
      background: colors.background,
      color: colors.text,
      outline: 'none',
    },
    fileInput: {
      padding: '0.75rem',
      border: `1.5px dashed ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.85rem',
      background: colors.background,
      color: colors.text,
      cursor: 'pointer',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.85rem',
      color: colors.text,
      cursor: 'pointer',
    },
    divider: {
      border: 'none',
      borderTop: `2px solid ${colors.border}`,
      margin: '1rem 0',
    },
    listBlock: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    listItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    bullet: {
      color: colors.pink,
      fontSize: '1.2rem',
      fontWeight: 'bold',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
    },
    listInput: {
      flex: 1,
      padding: '0.625rem 0.875rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: colors.background,
      color: colors.text,
      outline: 'none',
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: colors.background,
      color: colors.text,
      outline: 'none',
    },
    addItemButton: {
      padding: '0.5rem 0.875rem',
      background: colors.background,
      color: colors.text,
      border: `1.5px dashed ${colors.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    mapBlock: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    mapPlaceholder: {
      padding: '2rem',
      background: colors.background,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '1.1rem',
      color: colors.textSecondary,
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create Blog Post</h2>
          <div style={styles.headerButtons}>
            <button onClick={handleSave} style={styles.saveButton}>
              Publish
            </button>
            <button onClick={onClose} style={styles.button}>
              Cancel
            </button>
          </div>
        </div>

        <div style={styles.content}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            style={styles.titleInput}
          />

          <div style={styles.metadataSection}>
            <div style={styles.metadataRow}>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country (e.g., Japan)"
                style={styles.metadataInput}
              />
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration (e.g., 7 days)"
                style={styles.metadataInput}
              />
            </div>
            <div style={styles.metadataRow}>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                style={styles.metadataSelect}
              >
                <option value="Luxury">Luxury</option>
                <option value="Adventure">Adventure</option>
                <option value="Casual">Casual</option>
                <option value="Wellness">Wellness</option>
                <option value="Eco">Eco</option>
              </select>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Hashtags (e.g., #travel #adventure)"
                style={styles.metadataInput}
              />
            </div>
          </div>

          <div style={styles.blockTypeSelector}>
            {blockTypes.map(blockType => (
              <button
                key={blockType.type}
                onClick={() => addBlock(blockType.type)}
                style={styles.blockTypeButton}
              >
                <span>{blockType.icon}</span>
                <span>{blockType.label}</span>
              </button>
            ))}
          </div>

          <div style={styles.blocksContainer}>
            {blocks.map((block, index) => (
              <div
                key={block.id}
                style={styles.block}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div style={styles.blockHeader}>
                  <div style={styles.blockType}>
                    <span>⋮⋮</span>
                    {blockTypes.find(t => t.type === block.type)?.label}
                  </div>
                  <button onClick={() => deleteBlock(block.id)} style={styles.deleteButton}>
                    Delete
                  </button>
                </div>
                {renderBlock(block, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostEditor;
