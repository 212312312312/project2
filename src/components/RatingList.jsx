import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, Button, Chip } from '@mui/material';
import { getAllRatings, toggleIgnoreRating } from '../services/ratingService';

const RatingList = () => {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRatings();
    }, []);

    const loadRatings = async () => {
        setLoading(true);
        try {
            const data = await getAllRatings();
            const rawArray = Array.isArray(data) ? data : (data?.content || data?.data || []);
            const formatted = rawArray.map(r => ({ ...r, id: r.id || Math.random() }));
            setRatings(formatted);
        } catch (error) {
            console.error("Помилка завантаження рейтингів:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleIgnore = async (id) => {
        try {
            await toggleIgnoreRating(id);
            loadRatings();
        } catch (err) {
            console.error("Помилка зміни статусу:", err);
        }
    };

    // Перехід до картки водія
    const handleOpenDriver = (e, row) => {
        e.stopPropagation();
        const driverId = row.driverId || row.driver?.id || row.driver_id;
        const driverName = row.driverName || row.driver?.fullName || '';

        if (driverId) {
            window.location.href = `/drivers?openId=${driverId}`;
        } else if (driverName) {
            window.location.href = `/drivers?search=${encodeURIComponent(driverName)}`;
        }
    };

    // Перехід до картки клієнта
    const handleOpenClient = (e, row) => {
        e.stopPropagation();
        const clientId = row.clientId || row.client?.id || row.client_id || row.userId;
        const clientName = row.clientName || row.client?.fullName || '';

        if (clientId) {
            window.location.href = `/clients?openId=${clientId}`;
        } else if (clientName) {
            window.location.href = `/clients?search=${encodeURIComponent(clientName)}`;
        }
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'date', headerName: 'Дата', width: 140 },
        { 
            field: 'score', 
            headerName: 'Оцінка', 
            width: 110,
            renderCell: (params) => (
                <Chip 
                    label={`${params.value || 5} ★`} 
                    color={params.value >= 4 ? 'success' : params.value >= 3 ? 'warning' : 'error'} 
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            )
        },
        { 
            field: 'driverName', 
            headerName: 'Водій', 
            width: 220,
            renderCell: (params) => {
                const name = params.value || params.row.driver?.fullName || '—';
                return (
                    <Box
                        component="span"
                        onClick={(e) => handleOpenDriver(e, params.row)}
                        sx={{
                            color: '#0284c7 !important',
                            fontWeight: '600 !important',
                            cursor: 'pointer !important',
                            textDecoration: 'underline',
                            display: 'inline-block',
                            width: '100%'
                        }}
                        title="Натисніть для переходу до детальної інформації"
                    >
                        {name}
                    </Box>
                );
            }
        },
        { 
            field: 'clientName', 
            headerName: 'Клієнт', 
            width: 220,
            renderCell: (params) => {
                const name = params.value || params.row.client?.fullName || '—';
                return (
                    <Box
                        component="span"
                        onClick={(e) => handleOpenClient(e, params.row)}
                        sx={{
                            color: '#0284c7 !important',
                            fontWeight: '600 !important',
                            cursor: 'pointer !important',
                            textDecoration: 'underline',
                            display: 'inline-block',
                            width: '100%'
                        }}
                        title="Натисніть для переходу до детальної інформації"
                    >
                        {name}
                    </Box>
                );
            }
        },
        { field: 'comment', headerName: 'Коментар', width: 300, flex: 1 },
        {
            field: 'actions',
            headerName: 'Дії',
            width: 150,
            renderCell: (params) => {
                const isIgnored = params.row.comment?.includes('[IGNORED]') || params.row.isIgnored;
                return (
                    <Button 
                        variant="outlined" 
                        size="small" 
                        color="secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleIgnore(params.row.id);
                        }}
                    >
                        {isIgnored ? 'Розархівувати' : 'Архівувати'}
                    </Button>
                );
            }
        }
    ];

    return (
        <Box sx={{ height: 650, width: '100%', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3, color: '#0f172a' }}>
                Рейтинг та відгуки
            </Typography>
            
            <DataGrid
                rows={ratings}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 20, 50]}
                disableSelectionOnClick
                loading={loading}
                getRowId={(row) => row.id}
            />
        </Box>
    );
};

export default RatingList;