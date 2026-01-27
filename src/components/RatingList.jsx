import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, Button, Chip } from '@mui/material';
import ratingService from '../services/ratingService';

const RatingList = () => {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRatings();
    }, []);

    const loadRatings = () => {
        setLoading(true);
        ratingService.getAllRatings()
            .then(response => {
                console.log("Ratings loaded:", response.data);
                // Добавляем уникальный id для DataGrid, если его нет
                const data = response.data.map(r => ({...r, id: r.id || Math.random()}));
                setRatings(data);
            })
            .catch(error => {
                console.error("Error loading ratings:", error);
            })
            .finally(() => setLoading(false));
    };

    const handleIgnore = (id) => {
        ratingService.toggleIgnore(id)
            .then(() => loadRatings())
            .catch(err => console.error(err));
    };

    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { 
            field: 'date', 
            headerName: 'Дата', 
            width: 150 
        },
        { 
            field: 'score', 
            headerName: 'Оцінка', 
            width: 100,
            renderCell: (params) => (
                <Chip 
                    label={params.value} 
                    color={params.value >= 4 ? 'success' : params.value >= 3 ? 'warning' : 'error'} 
                    size="small"
                />
            )
        },
        { 
            field: 'driverName', 
            headerName: 'Водій', 
            width: 200 
        },
        { 
            field: 'clientName', 
            headerName: 'Клієнт', 
            width: 200 
        },
        { 
            field: 'comment', 
            headerName: 'Коментар', 
            width: 300,
            flex: 1 
        },
        {
            field: 'actions',
            headerName: 'Дії',
            width: 150,
            renderCell: (params) => (
                <Button 
                    variant="outlined" 
                    size="small" 
                    color="primary"
                    onClick={() => handleIgnore(params.row.id)}
                >
                    Архівувати
                </Button>
            )
        }
    ];

    return (
        <Box sx={{ height: 600, width: '100%', p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Рейтинг та Відгуки
            </Typography>
            
            <DataGrid
                rows={ratings}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 20, 50]}
                disableSelectionOnClick
                loading={loading}
                getRowId={(row) => row.id} // Явно указываем ID
            />
        </Box>
    );
};

export default RatingList;